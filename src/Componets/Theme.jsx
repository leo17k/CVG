import { useState, useEffect } from "react";
import '../assets/Style/Switch.css';

const SwitchTheme = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = storedTheme === "dark" || (storedTheme === null && prefersDark);
    
    setIsDark(initialTheme);
    if (initialTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleThemeChange = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
    if (newTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (


    
    <label htmlFor="theme-switch" className="relative inline-block w-11 h-7 cursor-pointer ">
      <input
        type="checkbox"
        id="theme-switch"
        className="sr-only peer"
        checked={isDark}
        onChange={handleThemeChange}
      />
      
      {/* El deslizador */}
      <span 
        className="absolute shadow-inner shadow-gray-700 inset-0 bg-[var(--color-switch)] rounded-full transition-colors duration-400 "
      ></span>
      
      {/* La pastilla con los iconos de sol y luna */}
      <span 
        className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-all duration-400 
          ${isDark
            ? 'translate-x-3.5 bg-[var(--color-switch)] shadow-[inset_-5px_-1px_5px_-2px_#8983f7,inset_-10px_-4px_0_0_#a3dafb]'
            : 'bg-gradient-to-bl from-orange-500 to-rose-500'
          }`
        }
      ></span>
    </label>
  );
};

export default SwitchTheme;