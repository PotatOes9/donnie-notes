import type {Article} from './notion-core';
// Shared presentation type only. GitHub Pages has no server connection module.
export type Feed={articles:Article[];mode:'live'|'demo'|'error';error?:string};
