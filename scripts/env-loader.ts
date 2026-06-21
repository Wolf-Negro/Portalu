import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      const value = valueParts.join("=").trim();
      if (key && value) {
        const cleanValue = value.replace(/^["']|["']$/g, "");
        process.env[key.trim()] = cleanValue;
      }
    }
  });
} else {
  console.warn(".env.local not found. Environment variables might not be loaded.");
}
