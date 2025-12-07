import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ProcessedStackInput } from './stack-input';
import { LAMBDA_RUNTIME_NODEJS } from '../consts';

const UUID = 'A7F3E8D2-9B4C-4E1A-8F6D-2C5B7A9E3D1F';

// Bedrock でサポートされている埋め込みモデル
// Dimension は Custom resource の prop として渡されるが、型が自動変換される問題があるため、number ではなく string で設定
// https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/1037
const MODEL_VECTOR_MAPPING: { [key: string]: string } = {
  'amazon.titan-embed-text-v1': '1536',
  'amazon.titan-embed-text-v2:0': '1024',
  'cohere.embed-multilingual-v3': '1024',
  'cohere.embed-english-v3': '1024',
};

// Advanced Parsing 用のプロンプト
// PDF ファイルに埋め込まれた画像、グラフ、表を読み取る機能のプロンプト
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

interface S3VectorIndexProps {
  readonly vectorBucketName: string;
  readonly vectorIndexName: string;
  readonly vectorDimension: string;
}

class S3VectorIndex extends Construct {
  public readonly customResourceHandler: lambda.IFunction;
  public readonly customResource: cdk.CustomResource;

  constructor(scope: Construct, id: string, props: S3VectorIndexProps) {
    super(scope, id);

    const customResourceHandler = new lambda.SingletonFunction(
      this,
      'S3VectorIndex',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        code: lambda.Code.fromAsset('custom-resources/s3-vector-index'),
        handler: 's3-vector-index.handler',
        uuid: UUID,
        lambdaPurpose: 'S3VectorIndex',
        timeout: cdk.Duration.minutes(15),
      }
    );

    const customResource = new cdk.CustomResource(this, 'CustomResource', {
      serviceToken: customResourceHandler.functionArn,
      resourceType: 'Custom::S3VectorIndex',
      properties: props,
    });

    this.customResourceHandler = customResourceHandler;
    this.customResource = customResource;
  }
}

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
      env,
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

    const vectorBucketName =
      props.vectorBucketName ??
      `generative-ai-use-cases-s3-vector${env.toLowerCase()}`;
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

    // S3 Vector Bucket の作成
    const vectorBucket = new s3.Bucket(this, 'VectorBucket', {
      bucketName: vectorBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      enforceSSL: true,
    });

    // S3 Vector Index の作成
    const s3VectorIndex = new S3VectorIndex(this, 'S3VectorIndex', {
      vectorBucketName: vectorBucket.bucketName,
      vectorIndexName,
      vectorDimension: MODEL_VECTOR_MAPPING[embeddingModelId],
    });

    s3VectorIndex.customResourceHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [vectorBucket.bucketArn, `${vectorBucket.bucketArn}/*`],
        actions: [
          's3:ListBucket',
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
        ],
      })
    );

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

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [vectorBucket.bucketArn, `${vectorBucket.bucketArn}/*`],
        actions: [
          's3:ListBucket',
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
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

    const knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: `${vectorBucketName}-kb`,
      roleArn: knowledgeBaseRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${this.region}::foundation-model/${embeddingModelId}`,
        },
      },
      storageConfiguration: {
        type: 'S3_VECTOR',
        s3Configuration: {
          bucketArn: vectorBucket.bucketArn,
        },
      },
    });

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
              // Advanced Parsing が有効な場合のみ設定
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

    knowledgeBase.node.addDependency(s3VectorIndex.customResource);

    new s3Deploy.BucketDeployment(this, 'DeployDocs', {
      sources: [s3Deploy.Source.asset('./rag-docs')],
      destinationBucket: dataSourceBucket,
      exclude: ['AccessLogs/*', 'logs*'],
      prune: false,
      memoryLimit: 1024,
    });

    this.knowledgeBaseId = knowledgeBase.ref;
    this.dataSourceBucketName = dataSourceBucket.bucketName;
    this.vectorBucketName = vectorBucket.bucketName;
  }
}
