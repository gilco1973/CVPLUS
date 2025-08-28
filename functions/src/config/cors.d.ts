export declare const corsOptions: {
    cors: (string | RegExp)[];
};
export declare const requestCorsOptions: {
    cors: (string | RegExp)[];
};
export declare const simpleCorsOptions: {
    cors: boolean;
};
export declare const enhancedCorsOptions: {
    cors: (string | RegExp)[];
};
export declare const strictCorsOptions: {
    cors: (string | RegExp)[];
};
export declare function addCorsHeaders(response: any, origin?: string): void;
export declare function corsMiddleware(req: any, res: any, next?: () => void): void;
export declare function isOriginAllowed(origin: string): boolean;
//# sourceMappingURL=cors.d.ts.map