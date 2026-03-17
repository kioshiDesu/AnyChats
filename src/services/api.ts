export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export interface ApiOptions {
  apiMode: 'cloud' | 'local';
  apiKey: string;
  localEndpoint: string;
  model: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

export async function fetchModels(options: ApiOptions) {
  if (options.apiMode === 'local') {
    // Ollama tags endpoint
    const url = options.localEndpoint.endsWith('/') ? options.localEndpoint.slice(0, -1) : options.localEndpoint;
    const response = await fetch(`${url}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.models.map((m: any) => ({
      id: m.name,
      name: m.name,
      context_length: 4096, // default assumption for Ollama
      pricing: { prompt: '0', completion: '0' },
    }));
  } else {
    // OpenRouter models endpoint
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'OpenRouter Mobile Chat',
      },
    });

    if (!response.ok) {
      let errorText = response.statusText;
      try {
        const errJson = await response.json();
        if (errJson.error && errJson.error.message) {
          errorText = errJson.error.message;
        }
      } catch (e) {
        // ignore
      }
      throw new Error(`OpenRouter Error: ${errorText}`);
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response from OpenRouter API');
    }
    return data.data;
  }
}

export async function sendMessage(
  messages: { role: string; content: string }[],
  options: ApiOptions,
  signal?: AbortSignal
) {
  if (options.apiMode === 'cloud' && !navigator.onLine) {
    throw new Error('You are currently offline. Please connect to the internet or switch to Local (Ollama) mode.');
  }

  const { apiMode, apiKey, localEndpoint, model, temperature, topP, maxTokens } = options;
  const isLocal = apiMode === 'local';
  
  const baseUrl = isLocal 
    ? (localEndpoint.endsWith('/') ? localEndpoint.slice(0, -1) : localEndpoint) + '/v1'
    : OPENROUTER_BASE_URL;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!isLocal) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'OpenRouter Mobile Chat';
  }

  const body: any = {
    model,
    messages,
    stream: false,
  };

  if (temperature !== undefined) body.temperature = temperature;
  if (topP !== undefined) body.top_p = topP;
  if (maxTokens !== undefined && maxTokens > 0) body.max_tokens = maxTokens;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    signal,
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response from API');
  }

  return data.choices[0].message.content;
}

export async function* streamChat(
  messages: { role: string; content: string }[],
  options: ApiOptions,
  signal?: AbortSignal
) {
  if (options.apiMode === 'cloud' && !navigator.onLine) {
    throw new Error('You are currently offline. Please connect to the internet or switch to Local (Ollama) mode.');
  }

  const { apiMode, apiKey, localEndpoint, model, temperature, topP, maxTokens } = options;
  const isLocal = apiMode === 'local';
  
  const baseUrl = isLocal 
    ? (localEndpoint.endsWith('/') ? localEndpoint.slice(0, -1) : localEndpoint) + '/v1'
    : OPENROUTER_BASE_URL;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!isLocal) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'OpenRouter Mobile Chat';
  }

  const body: any = {
    model,
    messages,
    stream: true,
  };

  if (temperature !== undefined) body.temperature = temperature;
  if (topP !== undefined) body.top_p = topP;
  if (maxTokens !== undefined && maxTokens > 0) body.max_tokens = maxTokens;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    signal,
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error: ${response.status} ${errorBody}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.trim() === 'data: [DONE]') return;
        
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
              yield data.choices[0].delta.content;
            }
          } catch (e) {
            console.error('Error parsing streaming data', e, line);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
