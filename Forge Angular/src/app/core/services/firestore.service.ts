import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  addDoc,
  deleteDoc,
  DocumentData,
  DocumentReference,
  getDoc,
  getDocs,
  getFirestore,
  Query,
  UpdateData,
  updateDoc,
  CollectionReference,
} from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase.config';
import { UsageDay } from '../models/models';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  readonly db = getFirestore(initializeApp(firebaseConfig));
  private pending: UsageDay = { reads: 0, writes: 0, deletes: 0 };

  async getDoc(ref: DocumentReference) {
    const snap = await getDoc(ref);
    this.pending.reads += 1;
    return snap;
  }

  async getDocs(query: Query) {
    const snap = await getDocs(query);
    this.pending.reads += Math.max(1, snap.size);
    return snap;
  }

  async addDoc(collection: CollectionReference, data: object) {
    const ref = await addDoc(collection, data as DocumentData);
    this.pending.writes += 1;
    return ref;
  }

  async updateDoc(ref: DocumentReference, data: object) {
    await updateDoc(ref, data as UpdateData<DocumentData>);
    this.pending.writes += 1;
  }

  async deleteDoc(ref: DocumentReference) {
    await deleteDoc(ref);
    this.pending.deletes += 1;
  }

  takePending(): UsageDay {
    const taken = this.pending;
    this.pending = { reads: 0, writes: 0, deletes: 0 };
    return taken;
  }

  addPending(usage: UsageDay): void {
    this.pending.reads += usage.reads;
    this.pending.writes += usage.writes;
    this.pending.deletes += usage.deletes;
  }

  peekPending(): UsageDay {
    return { ...this.pending };
  }
}
