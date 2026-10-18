export const metadata = { title: "Privacy – Wedding Planner" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Privacy</h1>
      <p>
        Wedding Planner is a private tool used by one family to plan a wedding. It is not a public service.
      </p>
      <h2 className="font-semibold">What we keep</h2>
      <p>
        When you sign in with Google or an email link, we store your email address so the family can approve you.
        We do not read your Google contacts, email, files or any other Google data.
      </p>
      <p>
        The planner itself holds the guest list, events, vendors and budget that family members enter.
      </p>
      <h2 className="font-semibold">Who can see it</h2>
      <p>Only people the wedding family has approved. We do not sell or share this information with anyone.</p>
      <h2 className="font-semibold">Removing your data</h2>
      <p>Ask the family member who invited you and they will remove your access and your email address.</p>
    </main>
  );
}
