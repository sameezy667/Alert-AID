// Type declarations for importing CSS and assets in TypeScript
declare module '*.css';
declare module '*.scss';
declare module '*.sass';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.webp';
declare module '*.ico';

declare namespace NodeJS {
    interface ProcessEnv {
        readonly NODE_ENV: 'development' | 'production' | 'test';
        readonly REACT_APP_API_URL: string;
        readonly REACT_APP_OPENWEATHER_API_KEY: string;
        [key: string]: string | undefined;
    }
}

declare var process: {
    env: NodeJS.ProcessEnv;
};
