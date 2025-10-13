import { mergeConfig } from 'vite';
import baseConfig from './config.base.mjs';

// Merges the base config with dev-specific settings
export default mergeConfig(baseConfig, {
    server: {
        port: 8080
    }
});