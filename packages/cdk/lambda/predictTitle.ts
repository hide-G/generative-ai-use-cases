import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  PredictTitleRequest,
  UnrecordedMessage,
} from 'generative-ai-use-cases';
import { setChatTitle } from './repository';
import api from './utils/api';
import { defaultModel } from './utils/models';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      throw new Error('Request body is missing');
    }

    const req = JSON.parse(event.body) as PredictTitleRequest;

    // Validation
    if (!req.prompt || !req.chat?.id || !req.chat?.createdDate || !req.id) {
      throw new Error('Invalid request format');
    }

    // Use the lightweight default model for title generation
    const model = defaultModel;

    // Add a question for title setting
    const messages: UnrecordedMessage[] = [
      {
        role: 'user',
        content: req.prompt,
      },
    ];

    // When adding a new model, the default Claude prompter is used, so the output may be enclosed in <output></output>
    // The following processing removes the xml tags containing <output></output>
    // Also handles reasoning content that may be included in newer models (Issue #1365)
    let title =
      (await api['bedrock'].invoke?.(model, messages, req.id))?.replace(
        /<([^>]+)>([\s\S]*?)<\/\1>/g,
        '$2'
      ) ?? '';

    // Generic error handling for new AI models (re:Invent 2025+)
    // Remove any remaining reasoning/thinking patterns that may leak into the title
    // Pattern 1: Remove text before the actual title that looks like reasoning
    // Pattern 2: Remove common reasoning prefixes
    const reasoningPatterns = [
      /^.*?(?:I need to|Let me|The user wants|I should|I'll|I will|Looking at|Based on|Analyzing|Thinking about|Consider).*?\n+/gi,
      /^.*?(?:create a title|generate a title|make a title|write a title).*?\n+/gi,
    ];
    for (const pattern of reasoningPatterns) {
      title = title.replace(pattern, '');
    }

    // Trim and take only the last line if multiple lines exist (the actual title is usually the last line)
    const lines = title.trim().split('\n').filter((line: string) => line.trim().length > 0);
    if (lines.length > 1) {
      // If the last line looks like a proper title (not too long), use it
      const lastLine = lines[lines.length - 1].trim();
      if (lastLine.length <= 50) {
        title = lastLine;
      }
    }

    title = title.trim();

    await setChatTitle(req.chat.id, req.chat.createdDate, title);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: title,
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
