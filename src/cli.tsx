import meow from 'meow';
import App from './app.js';
import { render } from './lib/render.js';

meow(
  `
	Usage
	  $ clairo

	Options
		--name  Your name

	Examples
	  $ clairo --name=Jane
	  Hello, Jane
`,
  {
    importMeta: import.meta,
    flags: {
      name: {
        type: 'string'
      }
    }
  }
);

render(<App />);
