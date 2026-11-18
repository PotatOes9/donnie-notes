import {createContext,useContext} from 'react';
import type {Snapshot} from './types';
export const SnapshotContext=createContext<Snapshot|null>(null);
export function useSnapshot(){const value=useContext(SnapshotContext);if(!value)throw new Error('Missing snapshot');return value;}
