import {
  RetrieveKnowledgeBaseRequest,
  RetrieveKnowledgeBaseResponse,
} from 'generative-ai-use-cases';
import useHttp from './useHttp';

const useRagS3VectorApi = () => {
  const http = useHttp();
  return {
    retrieve: (query: string) => {
      return http.post<
        RetrieveKnowledgeBaseResponse,
        RetrieveKnowledgeBaseRequest
      >('/rag-s3-vector/retrieve', {
        query,
      });
    },
  };
};

export default useRagS3VectorApi;
