'use client';
import {createContext,useContext} from 'react';
import type {Feed} from '@/lib/blog-server';
import type {JournalView} from '@/lib/journal-navigation';
export type JournalNavigationValue={view:JournalView;pathname:string;feed:Feed;stale:boolean;navigate:(href:string)=>boolean};
export const JournalContext=createContext<JournalNavigationValue|null>(null);
export function useJournalNavigation(){return useContext(JournalContext);}
export function useJournalFeed(fallback:Feed){const journal=useJournalNavigation();return {feed:journal?.feed??fallback,stale:journal?.stale??false};}
