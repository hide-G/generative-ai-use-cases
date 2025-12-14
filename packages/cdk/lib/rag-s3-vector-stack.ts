import { Stack, StackProps, RemovalPolicy, CfnResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ProcessedStackInput } from './stack-input';

// Embedding models supported by Bedrock
const MODEL_VECTOR_MAPPING: { [key: string]: number } = {
  'amazon.titan-embed-text-v1': 1536,
  'amazon.titan-embed-text-v2:0': 1024,
  'cohere.embed-multilingual-v3': 1024,
  'cohere.embed-english-v3': 1024,
};

// Prompt for Advanced Parsing
// Prompt for reading images, graphs, and tables embedded in PDF files
// https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking-parsing.html#kb-advanced-parsing
const PARSING_PROMPT = `Write the text from the image, graph, and table content in the document, and output it in Markdown syntax, not a code block. Follow the following steps:

1. Carefully examine the provided page.

2. Identify all elements on the page. This includes headings, body text, footnotes, tables, visualizations, captions, and page numbers.

3. Output using Markdown syntax:
- Headings: Use # for main headings, ## for sections, ### for sub-sections, etc.
- Lists: Use * or - for bullet points, and 1. 2. 3. for numbered lists.
- Avoid repetition.
- IMPORTANT:Output in same language as the document.

4. If the element is a Visualization:
- Provide a detailed description in natural language.
- Do not transcribe the text in the Visualization after providing the description.

5. If the element is a Table:
- Create a Markdown table with all rows having the same number of columns.
- Keep the cell placement as faithful as possible.
- Do not split the table into multiple tables.
- If a combined cell spans multiple rows or columns, place the text in the top-left cell and output ' ' for other cells.
- Use | for column separators and |-|-| for header row separators.
- If a cell contains multiple items, list them in separate rows.
- If a table has a sub-header, separate the sub-header from the header on a different row.

6. If the element is a Paragraph:
- Transcribe the text elements as they appear.

7. If the element is a Header, Footer, Footnote, or Page Number:
- Transcribe the text elements as they appear.

Output Example:

A bar chart showing annual sales with the Y-axis labeled "Sales ($million)" and the X-axis labeled "Year". The chart has bars for 2018 ($12M), 2019 ($18M), 2020 ($8M), and 2021 ($22M).
Figure 3: This chart shows annual sales in millions of dollars. 2020 was significantly reduced due to the COVID-19 pandemic.

Annual Report
Financial Highlights
Revenue: $40M
Profit: $12M
EPS: $1.25
| | 12/31 ended year | |

2021	2022
Cash Flow:		
Operating Activity	$ 46,327	$ 46,752
Investing Activity	(58,154)	(37,601)
Financial Activity	6,291	9,718`;

const EMBEDDING_MODELS = Object.keys(MODEL_VECTOR_MAPPING);

export interface RagS3VectorStackProps extends StackProps {
  params: ProcessedStackInput;
  vectorBucketName?: string;
  vectorIndexName?: string;
}

export class RagS3VectorStack extends Stack {
  public readonly knowledgeBaseId: string;
  public readonly dataSourceBucketName: string;
  public readonly vectorBucketName: string;

  constructor(scope: Construct, id: string, props: RagS3VectorStackProps) {
    super(scope, id, props);

    const {
      embeddingModelId,
      ragS3VectorAdvancedParsing,
      ragS3VectorAdvancedParsingModelId,
      crossAccountBedrockRoleArn,
    } = props.params;

    if (typeof embeddingModelId !== 'string') {
      throw new Error(
        'S3 Vector RAG is enabled, but embeddingModelId is not specified'
      );
    }

    if (!EMBEDDING_MODELS.includes(embeddingModelId)) {
      throw new Error(
        `embeddingModelId is invalid (valid embeddingModelId: ${EMBEDDING_MODELS})`
      );
    }

    if (crossAccountBedrockRoleArn) {
      throw new Error(
        'With `crossAccountBedrockRoleArn` specified, you must use an existing knowledge base. Create a knowledge base in your Bedrock account and provide its `ragS3VectorKnowledgeBaseId`.'
      );
    }

    // Vector Index name (following GenU naming convention)
    const vectorIndexName =
      props.vectorIndexName ?? 'bedrock-kb-s3-vector-index';

    const knowledgeBaseRole = new iam.Role(this, 'KnowledgeBaseRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
    });

    if (
      ragS3VectorAdvancedParsing &&
      typeof ragS3VectorAdvancedParsingModelId !== 'string'
    ) {
      throw new Error(
        'S3 Vector RAG Advanced Parsing is enabled, but ragS3VectorAdvancedParsingModelId is not specified or is not a string'
      );
    }

    // Create Vector Bucket using CloudFormation native resource (AWS::S3Vectors::VectorBucket)
    // This eliminates the need for Custom Resource and is more reliable
    const vectorBucket = new CfnResource(this, 'VectorBucket', {
      type: 'AWS::S3Vectors::VectorBucket',
      properties: {
        // Let CloudFormation generate a unique name if not specified
        ...(props.vectorBucketName && {
          VectorBucketName: props.vectorBucketName,
        }),
      },
    });
    vectorBucket.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Get Vector Bucket ARN from CloudFormation attribute
    const vectorBucketArn = vectorBucket.getAtt('VectorBucketArn').toString();
    const vectorBucketNameRef = vectorBucket.ref;

    // Create Vector Index using CloudFormation native resource (AWS::S3Vectors::Index)
    const vectorIndex = new CfnResource(this, 'VectorIndex', {
      type: 'AWS::S3Vectors::Index',
      properties: {
        VectorBucketArn: vectorBucketArn,
        IndexName: vectorIndexName,
        DataType: 'float32',
        Dimension: MODEL_VECTOR_MAPPING[embeddingModelId],
        DistanceMetric: 'cosine',
      },
    });
    vectorIndex.applyRemovalPolicy(RemovalPolicy.DESTROY);
    vectorIndex.addDependency(vectorBucket);

    const accessLogsBucket = new s3.Bucket(this, 'DataSourceAccessLogsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      enforceSSL: true,
    });

    const dataSourceBucket = new s3.Bucket(this, 'DataSourceBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: 'AccessLogs/',
      enforceSSL: true,
    });

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['bedrock:InvokeModel'],
      })
    );

    // Grant S3 Vectors permissions to Knowledge Base role
    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [vectorBucketArn, `${vectorBucketArn}/*`],
        actions: [
          's3vectors:ListBucket',
          's3vectors:GetObject',
          's3vectors:PutObject',
          's3vectors:DeleteObject',
          's3vectors:QueryVectors',
          's3vectors:PutVectors',
          's3vectors:GetVectors',
          's3vectors:DeleteVectors',
        ],
      })
    );

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}`],
        actions: ['s3:ListBucket'],
      })
    );

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}/*`],
        actions: ['s3:GetObject'],
      })
    );

    // Create Knowledge Base with S3 Vectors storage configuration
    const knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: `${id}-kb`,
      roleArn: knowledgeBaseRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${this.region}::foundation-model/${embeddingModelId}`,
        },
      },
      storageConfiguration: {
        type: 'S3_VECTORS',
        // Use addPropertyOverride for S3VectorsConfiguration since CDK types may not be updated
      },
    });

    // Set S3VectorsConfiguration using addPropertyOverride
    // This is necessary because CDK type definitions may not include the latest S3 Vectors properties
    knowledgeBase.addPropertyOverride(
      'StorageConfiguration.S3VectorsConfiguration',
      {
        VectorBucketArn: vectorBucketArn,
        IndexName: vectorIndexName,
      }
    );

    knowledgeBase.addDependency(vectorIndex);

    new bedrock.CfnDataSource(this, 'DataSource', {
      dataSourceConfiguration: {
        s3Configuration: {
          bucketArn: `arn:aws:s3:::${dataSourceBucket.bucketName}`,
          inclusionPrefixes: ['docs/'],
        },
        type: 'S3',
      },
      vectorIngestionConfiguration: {
        ...(ragS3VectorAdvancedParsing
          ? {
              // Set only when Advanced Parsing is enabled
              parsingConfiguration: {
                parsingStrategy: 'BEDROCK_FOUNDATION_MODEL',
                bedrockFoundationModelConfiguration: {
                  modelArn: `arn:aws:bedrock:${this.region}::foundation-model/${ragS3VectorAdvancedParsingModelId}`,
                  parsingPrompt: {
                    parsingPromptText: PARSING_PROMPT,
                  },
                },
              },
            }
          : {}),
      },
      knowledgeBaseId: knowledgeBase.ref,
      name: 's3-data-source',
    });

    new s3Deploy.BucketDeployment(this, 'DeployDocs', {
      sources: [s3Deploy.Source.asset('./rag-docs')],
      destinationBucket: dataSourceBucket,
      exclude: ['AccessLogs/*', 'logs*'],
      prune: false,
      memoryLimit: 1024,
    });

    // Output values
    this.knowledgeBaseId = knowledgeBase.ref;
    this.dataSourceBucketName = dataSourceBucket.bucketName;
    this.vectorBucketName = vectorBucketNameRef;

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'VectorBucketArn', {
      value: vectorBucketArn,
      description: 'ARN of the S3 Vector Bucket',
    });

    new cdk.CfnOutput(this, 'VectorIndexArn', {
      value: vectorIndex.getAtt('IndexArn').toString(),
      description: 'ARN of the S3 Vector Index',
    });

    new cdk.CfnOutput(this, 'KnowledgeBaseIdOutput', {
      value: knowledgeBase.ref,
      description: 'ID of the Bedrock Knowledge Base',
    });

    new cdk.CfnOutput(this, 'DataSourceBucketNameOutput', {
      value: dataSourceBucket.bucketName,
      description: 'Name of the Data Source S3 Bucket',
    });
  }
}
