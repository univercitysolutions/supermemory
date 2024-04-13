import { db } from "@/server/db";
import {
  contentToSpace,
  sessions,
  space,
  StoredContent,
  storedContent,
  users,
} from "@/server/db/schema";
import { and, eq, inArray, not } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  fetchContentForSpace,
  fetchFreeMemories,
  transformContent,
} from "../../types/memory";
import { MemoryProvider } from "@/contexts/MemoryContext";
import Content from "./content";
import { searchMemoriesAndSpaces } from "@/actions/db";

export const runtime = "edge";

export default async function Home() {
  const token =
    cookies().get("next-auth.session-token")?.value ??
    cookies().get("__Secure-authjs.session-token")?.value ??
    cookies().get("authjs.session-token")?.value ??
    headers().get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return redirect("/api/auth/signin");
  }

  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, token!));

  if (!session || session.length === 0) {
    return redirect("/api/auth/signin");
  }

  const [userData] = await db
    .select()
    .from(users)
    .where(eq(users.id, session[0].userId))
    .limit(1);

  if (!userData) {
    return redirect("/api/auth/signin");
  }

  console.log(storedContent.user.name);

  const collectedSpaces = await db
    .select()
    .from(space)
    .where(eq(space.user, userData.id))
		.all();

	console.log(collectedSpaces)

  // Fetch only first 3 content of each spaces
  let contents: (typeof storedContent.$inferSelect)[] = [];

  await Promise.all([
    collectedSpaces.forEach(async (space) => {
      contents = [
        ...contents,
        ...(await fetchContentForSpace(space.id, {
          offset: 0,
          limit: 3,
        })),
      ];
    }),
  ]);

  // freeMemories
  const freeMemories = await fetchFreeMemories(userData.id);

  // @dhravya test these 3 functions
  fetchFreeMemories;
  fetchContentForSpace;
  searchMemoriesAndSpaces;

  collectedSpaces.push({
    id: 1,
    name: "Cool tech",
    user: null,
  });

  return (
    <MemoryProvider
      user={userData}
      spaces={collectedSpaces}
      freeMemories={freeMemories}
      cachedMemories={contents}
    >
      <Content jwt={token} />
      {/* <MessagePoster jwt={token} /> */}
    </MemoryProvider>
  );
}
