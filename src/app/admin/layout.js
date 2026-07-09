import AdminEntete from "@/components/AdminEntete";

export const metadata = { title: "NOTARIA — Administration plateforme" };

export default function AdminLayout({ children }) {
  return (
    <>
      <AdminEntete />
      <main className="page admin-page">{children}</main>
    </>
  );
}
