import {
  S3Client,
  CreateVectorIndexCommand,
  DeleteVectorIndexCommand,
} from '@aws-sdk/client-s3';

const s3Client = new S3Client({});

interface ResourceProperties {
  vectorBucketName: string;
  vectorIndexName: string;
  vectorDimension: string;
}

/**
 * S3 Vector Index を作成・削除するカスタムリソース
 * CloudFormation の Create/Update/Delete イベントに応じて S3 Vector Index を管理
 */
export const handler = async (event: any): Promise<any> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const {
    RequestType,
    ResourceProperties: props,
    PhysicalResourceId,
  } = event as {
    RequestType: 'Create' | 'Update' | 'Delete';
    ResourceProperties: ResourceProperties;
    PhysicalResourceId?: string;
  };

  const { vectorBucketName, vectorIndexName, vectorDimension } = props;

  try {
    if (RequestType === 'Create' || RequestType === 'Update') {
      console.log(
        `Creating S3 Vector Index: ${vectorIndexName} in bucket: ${vectorBucketName}`
      );

      // S3 Vector Index の作成
      const createCommand = new CreateVectorIndexCommand({
        Bucket: vectorBucketName,
        VectorIndexName: vectorIndexName,
        VectorIndexConfiguration: {
          Dimension: parseInt(vectorDimension, 10),
          DistanceMetric: 'COSINE', // Bedrock Knowledge Base では COSINE を使用
        },
      });

      await s3Client.send(createCommand);

      console.log('S3 Vector Index created successfully');

      return {
        PhysicalResourceId: `${vectorBucketName}/${vectorIndexName}`,
        Data: {
          VectorBucketName: vectorBucketName,
          VectorIndexName: vectorIndexName,
        },
      };
    } else if (RequestType === 'Delete') {
      console.log(
        `Deleting S3 Vector Index: ${vectorIndexName} from bucket: ${vectorBucketName}`
      );

      try {
        // S3 Vector Index の削除
        const deleteCommand = new DeleteVectorIndexCommand({
          Bucket: vectorBucketName,
          VectorIndexName: vectorIndexName,
        });

        await s3Client.send(deleteCommand);

        console.log('S3 Vector Index deleted successfully');
      } catch (error: any) {
        // Index が既に存在しない場合はエラーを無視
        if (error.name === 'NoSuchVectorIndex') {
          console.log('Vector Index does not exist, skipping deletion');
        } else {
          throw error;
        }
      }

      return {
        PhysicalResourceId: PhysicalResourceId || 'deleted',
      };
    }
  } catch (error: any) {
    console.error('Error:', error);
    throw error;
  }
};
