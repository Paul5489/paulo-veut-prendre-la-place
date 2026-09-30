import { render } from 'preact';
import { App } from './app';
import { initMiseAJour } from './pwa';
import './styles.css';

render(<App />, document.getElementById('app')!);
initMiseAJour();
