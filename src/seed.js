// src/seed.js
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const seedUser = async () => {
  const email = "test@example.com";
  const password = "123456";

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if user already exists
  const { data: existingUser, error: checkError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    console.error("Error checking user:", checkError);
    return;
  }

  if (existingUser) {
  const { error } = await supabase
    .from("users")
    .update({ password: hashedPassword })
    .eq("email", email);
  if (error) console.error("Error updating password:", error);
  else console.log(`Password reset for existing user: ${email}`);
  return;
}
  // Insert new user
  const { data, error } = await supabase
    .from("users")
    .insert([{ email, password: hashedPassword }])
    .select()
    .single();

  if (error) {
    console.error("Error inserting user:", error);
  } else {
    console.log(`User seeded: ${email} / ${password}`);
  }
};

seedUser();