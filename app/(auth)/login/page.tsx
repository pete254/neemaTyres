import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import PasswordInput from "./PasswordInput";

export default function LoginPage() {
  async function handleLogin(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-[#EAB308] mb-2">
          Kwambira Tyres
        </h1>
        <p className="text-zinc-400 mb-6 text-sm">Management System</p>
        <form action={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white focus:outline-none focus:border-[#EAB308]"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Password</label>
            <PasswordInput />
          </div>
          <button
            type="submit"
            className="w-full bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded py-2 transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
