import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./client";

export type UserRole = "client" | "sales" | "driver" | "admin" | null;

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  return firebaseSignOut(auth);
}

export function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getUserRole(
  user: User
): Promise<UserRole> {
  const tokenResult = await user.getIdTokenResult(true);
  const role = tokenResult.claims.role;
  if (role === "client" || role === "sales" || role === "driver" || role === "admin") {
    return role;
  }
  return null;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
