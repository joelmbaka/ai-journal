/** @type {import('tailwindcss').Config} */
module.exports = {
  // Update these paths to include all files that use NativeWind classes
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
