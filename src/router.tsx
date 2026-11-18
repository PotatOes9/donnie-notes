import {createContext,useContext} from 'react';
export const RouterPath=createContext('/');
export function usePathname(){return useContext(RouterPath);}
