/**
 * CLOUD FUNCTION STUB
 *
 * Deploy this as a Firebase Callable Function to assign custom claims (roles)
 * to users. Only users with role 'sales' can invoke this function.
 *
 * To deploy: copy this logic to your Firebase Functions project and deploy.
 *
 * Example invocation from client (must be authenticated as sales):
 *   const setUserRole = httpsCallable(functions, 'setUserRole');
 *   await setUserRole({ uid: 'user-uid', role: 'driver' });
 */

/*
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const setUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const token = await admin.auth().verifyIdToken(context.auth.token);
  const callerRole = token.role;
  if (callerRole !== "sales") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only sales can assign roles"
    );
  }

  const { uid, role } = data;
  if (!uid || !role) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "uid and role are required"
    );
  }
  if (!["client", "sales", "driver"].includes(role)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "role must be client, sales, or driver"
    );
  }

  await admin.auth().setCustomUserClaims(uid, { role });
  return { success: true, uid, role };
});
*/

export {};
