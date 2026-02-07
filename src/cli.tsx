import meow from 'meow';
import App from './app.js';
import { render } from './lib/render.js';

const cli = meow(
  `
	Usage
	  $ clairo

	Options
	  --cwd <path>  Run in a different directory
	  --version     Show version
	  --help        Show this help

	Examples
	  $ clairo
	  $ clairo --cwd ~/projects/other-repo
`,
  {
    importMeta: import.meta,
    flags: {
      cwd: {
        type: 'string',
        shortFlag: 'C'
      }
    }
  }
);

if (cli.flags.cwd) {
  try {
    process.chdir(cli.flags.cwd);
  } catch {
    console.error(`Error: Cannot access directory "${cli.flags.cwd}"`);
    process.exit(1);
  }
}

render(<App />);
