import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export function useStoredState<T>(key: string, initial: T, sanitize: (raw: unknown) => T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : sanitize(JSON.parse(raw));
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Couldn't save ${key}`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
