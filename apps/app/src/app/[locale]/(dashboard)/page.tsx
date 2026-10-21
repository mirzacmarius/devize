import { redirect } from "next/navigation";

/** The devize are the app's home until there is an overview to show here. */
export default function Page() {
  redirect("/estimates");
}
