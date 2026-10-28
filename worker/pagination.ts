import { HTTPException } from 'hono/http-exception';
import { storageLimits } from '../shared/limits';

export function readCursor(cursor: string | undefined) {
  if (cursor && cursor.length > storageLimits.cursorCharacters) {
    throw new HTTPException(400, { message: 'Invalid cursor.' });
  }
  return cursor ? { cursor } : {};
}
