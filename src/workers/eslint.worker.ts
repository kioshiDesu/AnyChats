export interface LintResult {
  file: string;
  line: number;
  message: string;
  severity: 'warning' | 'error';
}

self.onmessage = (e: MessageEvent) => {
  const { files } = e.data;
  const results: LintResult[] = [];

  // A very simple mock "linter" that detects common bad practices in code
  for (const file of files) {
    if (file.type !== 'file' || !file.path.match(/\.(js|ts|jsx|tsx)$/)) continue;
    
    const lines = file.content.split('\n');
    lines.forEach((line: string, index: number) => {
      if (line.includes('console.log')) {
        results.push({
          file: file.path,
          line: index + 1,
          message: 'Unexpected console statement',
          severity: 'warning'
        });
      }
      if (line.includes('alert(')) {
        results.push({
          file: file.path,
          line: index + 1,
          message: 'Unexpected alert',
          severity: 'warning'
        });
      }
      if (line.includes('TODO') || line.includes('FIXME')) {
        results.push({
          file: file.path,
          line: index + 1,
          message: 'Unresolved TODO/FIXME',
          severity: 'warning'
        });
      }
      if (line.includes('debugger')) {
        results.push({
          file: file.path,
          line: index + 1,
          message: 'Unexpected debugger statement',
          severity: 'error'
        });
      }
    });
  }

  self.postMessage(results);
};
