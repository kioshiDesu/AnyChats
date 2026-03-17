import { streamChat, ApiOptions } from './api';

export interface SkillParams {
  [key: string]: string | boolean | number;
}

export interface SkillContext {
  projectId: string;
  files: { path: string; content?: string }[];
  apiOptions: ApiOptions;
  onProgress?: (msg: string) => void;
  createFile: (path: string, type: 'file' | 'folder', content?: string) => Promise<any>;
  updateFile: (id: string, content: string) => Promise<any>;
}

export interface SkillDefinition {
  name: string;
  description: string;
  parameters: {
    [name: string]: {
      type: 'string' | 'boolean' | 'number';
      description: string;
      required: boolean;
      default?: any;
    };
  };
  handler: (params: SkillParams, context: SkillContext) => Promise<{ success: boolean; message: string; files?: string[] }>;
}

export const builtInSkills: SkillDefinition[] = [
  {
    name: "create-project",
    description: "Generate a full project scaffold from a template description",
    parameters: {
      type: {
        type: "string",
        description: "Project type (e.g., 'React', 'HTML/CSS/JS')",
        required: true,
      }
    },
    handler: async (params, context) => {
      const type = params.type as string;
      context.onProgress?.(`Generating scaffolding for ${type} project...`);
      
      const prompt = `Generate a complete ${type} project structure. 
Output your code in markdown codeblocks. Ensure you provide the \`path="path/to/file"\` meta tag in each codeblock so the files can be extracted.
Provide at least the main entry points (e.g. index.html, package.json, main/App files).`;

      const responseStream = await streamChat(
        [{ role: "user", content: prompt }],
        context.apiOptions
      );

      let content = "";
      for await (const chunk of responseStream) {
        content += chunk;
      }

      // We'll let the user apply files from the chat, 
      // but the skill itself could parse it if we wanted to fully automate.
      return { success: true, message: `Created project scaffold for ${type}.\n\n` + content };
    }
  },
  {
    name: "add-tests",
    description: "Generate unit tests for a specific file",
    parameters: {
      filePath: {
        type: "string",
        description: "The path of the file to test",
        required: true
      }
    },
    handler: async (params, context) => {
      const targetFile = context.files.find(f => f.path === params.filePath);
      if (!targetFile) {
        return { success: false, message: `File ${params.filePath} not found in workspace.` };
      }

      context.onProgress?.(`Generating tests for ${params.filePath}...`);

      const filePathString = String(params.filePath);
      const prompt = `Write unit tests for the following file: \`${filePathString}\`

\`\`\`
${targetFile.content}
\`\`\`

Output the test file codeblock with \`path="${filePathString.replace(/\.[^/.]+$/, "")}.test.js"\` or similar appropriate extension.`;

      const responseStream = await streamChat(
        [{ role: "user", content: prompt }],
        context.apiOptions
      );

      let content = "";
      for await (const chunk of responseStream) {
        content += chunk;
      }

      return { success: true, message: `Generated tests for ${params.filePath}:\n\n` + content };
    }
  },
  {
    name: "fix-bug",
    description: "Analyze and suggest a fix for an issue",
    parameters: {
      issue: {
        type: "string",
        description: "Description of the error or bug",
        required: true
      },
      filePath: {
        type: "string",
        description: "File where the bug might be (optional)",
        required: false
      }
    },
    handler: async (params, context) => {
      const issue = params.issue as string;
      const filePath = params.filePath as string;

      let fileContext = context.files.map(f => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');
      if (filePath) {
         const specific = context.files.find(f => f.path === filePath);
         if (specific) fileContext = `File: ${specific.path}\n\`\`\`\n${specific.content}\n\`\`\``;
      }

      const prompt = `I have a bug: ${issue}. \n\nHere is the relevant code:\n${fileContext}\n\nPlease fix the bug and provide the corrected codeblock with the original path.`;

      const responseStream = await streamChat(
        [{ role: "user", content: prompt }],
        context.apiOptions
      );

      let content = "";
      for await (const chunk of responseStream) {
        content += chunk;
      }

      return { success: true, message: `Bug fix suggestions:\n\n` + content };
    }
  }
];

export function parseSkillCommand(input: string): { skillName: string; params: string } | null {
  if (!input.startsWith('/')) return null;
  const match = input.match(/^\/([\w-]+)(?:\s+(.*))?$/);
  if (!match) return null;
  return { skillName: match[1], params: match[2] || '' };
}
