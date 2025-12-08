import {
  S3VectorsClient,
  CreateVectorBucketCommand,
  CreateIndexCommand,
  DeleteVectorBucketCommand,
  DeleteIndexCommand,
} from '@aws-sdk/client-s3vectors';
import * as https from 'https';
import * as url from 'url';

// Initialize S3 Vectors client with explicit region
// AWS SDK v3 requires explicit region configuration for S3 Vectors
const s3VectorsClient = new S3VectorsClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

interface ResourceProperties {
  vectorBucketName: string;
  vectorIndexName: string;
  vectorDimension: string;
}

interface CloudFormationEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
  ResponseURL: string;
  StackId: string;
  RequestId: string;
  ResourceType: string;
  LogicalResourceId: string;
  PhysicalResourceId?: string;
  ResourceProperties: ResourceProperties;
}

/**
 * CloudFormationに応答を送信
 */
async function sendResponse(
  event: CloudFormationEvent,
  status: 'SUCCESS' | 'FAILED',
  data?: any,
  physicalResourceId?: string,
  reason?: string
): Promise<void> {
  const responseBody = JSON.stringify({
    Status: status,
    Reason:
      reason ||
      `See CloudWatch Log Stream: ${process.env.AWS_LAMBDA_LOG_STREAM_NAME}`,
    PhysicalResourceId:
      physicalResourceId || event.PhysicalResourceId || 'NONE',
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data,
  });

  console.log('Response body:', responseBody);

  const parsedUrl = url.parse(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: 'PUT',
    headers: {
      'content-type': '',
      'content-length': responseBody.length,
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      console.log('Status code:', response.statusCode);
      console.log('Status message:', response.statusMessage);
      resolve();
    });

    request.on('error', (error) => {
      console.error('sendResponse Error:', error);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
}

/**
 * S3 Vector Index を作成・削除するカスタムリソース
 * CloudFormation の Create/Update/Delete イベントに応じて S3 Vector Index を管理
 */
export const handler = async (event: CloudFormationEvent): Promise<void> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const { RequestType, ResourceProperties: props, PhysicalResourceId } = event;

  const { vectorBucketName, vectorIndexName, vectorDimension } = props;

  try {
    if (RequestType === 'Create' || RequestType === 'Update') {
      console.log(
        `Creating Vector Bucket: ${vectorBucketName} and Index: ${vectorIndexName}`
      );

      // Step 1: Create Vector Bucket
      try {
        const createBucketCommand = new CreateVectorBucketCommand({
          vectorBucketName: vectorBucketName,
        });

        await s3VectorsClient.send(createBucketCommand);
        console.log(`Vector Bucket ${vectorBucketName} created successfully`);
      } catch (error: any) {
        // Ignore error if bucket already exists
        if (error.name === 'ConflictException') {
          console.log(`Vector Bucket ${vectorBucketName} already exists`);
        } else {
          throw error;
        }
      }

      // Step 2: Create S3 Vector Index (with retry logic)
      // Vector Bucket creation may take a few seconds to propagate
      let retries = 5;
      let lastError;

      for (let i = 0; i < retries; i++) {
        try {
          const createIndexCommand = new CreateIndexCommand({
            vectorBucketName: vectorBucketName,
            indexName: vectorIndexName,
            dataType: 'float32',
            dimension: parseInt(vectorDimension, 10),
            distanceMetric: 'cosine',
          });

          await s3VectorsClient.send(createIndexCommand);
          console.log('S3 Vector Index created successfully');
          break; // Success, exit loop
        } catch (error: any) {
          lastError = error;
          if (error.name === 'NotFoundException' && i < retries - 1) {
            console.log(
              `Vector Bucket not found, retrying in 5 seconds... (${i + 1}/${retries})`
            );
            await new Promise((resolve) => setTimeout(resolve, 5000));
          } else {
            throw error;
          }
        }
      }

      const physicalId = `${vectorBucketName}/${vectorIndexName}`;
      const data = {
        VectorBucketName: vectorBucketName,
        VectorIndexName: vectorIndexName,
      };

      await sendResponse(event, 'SUCCESS', data, physicalId);
    } else if (RequestType === 'Delete') {
      console.log(
        `Deleting S3 Vector Index: ${vectorIndexName} and Vector Bucket: ${vectorBucketName}`
      );

      try {
        // Step 1: Delete S3 Vector Index
        const deleteIndexCommand = new DeleteIndexCommand({
          vectorBucketName: vectorBucketName,
          indexName: vectorIndexName,
        });

        await s3VectorsClient.send(deleteIndexCommand);
        console.log('S3 Vector Index deleted successfully');
      } catch (error: any) {
        // Ignore error if index does not exist
        if (error.name === 'NotFoundException') {
          console.log('Vector Index does not exist, skipping deletion');
        } else {
          throw error;
        }
      }

      try {
        // Step 2: Delete Vector Bucket
        const deleteBucketCommand = new DeleteVectorBucketCommand({
          vectorBucketName: vectorBucketName,
        });

        await s3VectorsClient.send(deleteBucketCommand);
        console.log('Vector Bucket deleted successfully');
      } catch (error: any) {
        // Ignore error if bucket does not exist
        if (error.name === 'NotFoundException') {
          console.log('Vector Bucket does not exist, skipping deletion');
        } else {
          throw error;
        }
      }

      await sendResponse(event, 'SUCCESS', {}, PhysicalResourceId || 'deleted');
    }
  } catch (error: any) {
    console.error('Error:', error);
    await sendResponse(
      event,
      'FAILED',
      {},
      PhysicalResourceId,
      error.message || 'Unknown error'
    );
  }
};
