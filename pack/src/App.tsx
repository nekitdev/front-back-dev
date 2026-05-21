import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Suspense, lazy } from "react";

import Home from "./pages/Home";

const About = lazy(() => import("./pages/About"));

const App = () => (
  <BrowserRouter>
    <nav>
      <Link to="/">Главная</Link>
      <Link to="/about">О нас</Link>
    </nav>

    <Suspense fallback={<div>Загрузка...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
