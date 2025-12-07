import {
  S3VectorsClient,
  CreateIndexCommand,
  DeleteIndexCommand,
} from '@aws-sdk/client-s3vectors';
import * as https from 'https';
import * as url from 'url';

const s3VectorsClient = new S3VectorsClient({});

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
        `Creating S3 Vector Index: ${vectorIndexName} in bucket: ${vectorBucketName}`
      );

      // Create S3 Vector Index
      const createCommand = new CreateIndexCommand({
        Bucket: vectorBucketName,
        IndexName: vectorIndexName,
        IndexConfiguration: {
          Dimensions: parseInt(vectorDimension, 10),
        },
      });

      await s3VectorsClient.send(createCommand);

      console.log('S3 Vector Index created successfully');

      const physicalId = `${vectorBucketName}/${vectorIndexName}`;
      const data = {
        VectorBucketName: vectorBucketName,
        VectorIndexName: vectorIndexName,
      };

      await sendResponse(event, 'SUCCESS', data, physicalId);
    } else if (RequestType === 'Delete') {
      console.log(
        `Deleting S3 Vector Index: ${vectorIndexName} from bucket: ${vectorBucketName}`
      );

      try {
        // Delete S3 Vector Index
        const deleteCommand = new DeleteIndexCommand({
          Bucket: vectorBucketName,
          IndexName: vectorIndexName,
        });

        await s3VectorsClient.send(deleteCommand);

        console.log('S3 Vector Index deleted successfully');
      } catch (error: any) {
        // Ignore error if index does not exist
        if (error.name === 'NoSuchIndex' || error.name === 'NotFound') {
          console.log('Vector Index does not exist, skipping deletion');
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
