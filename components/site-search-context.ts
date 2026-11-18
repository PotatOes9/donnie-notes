'use client';
import {createContext,useContext,useEffect} from 'react';
import type {Feed} from '@/lib/blog-server';
export const SearchContext=createContext<{openSearch:()=>void;syncFeed:(feed:Feed)=>void;isOpen:boolean}>({openSearch:()=>{},syncFeed:()=>{},isOpen:false});
export function useSiteSearch(){return useContext(SearchContext);}
export function useSearchFeed(feed:Feed){const {syncFeed}=useSiteSearch();useEffect(()=>syncFeed(feed),[feed,syncFeed]);}
