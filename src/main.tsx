import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router";
import { Shell } from "@/components/shell";
import { HomePage } from "@/pages/home";
import { RideDetailPage, RidesPage } from "@/pages/rides";
import { LoginPage, RegisterPage, VerifyPage } from "@/pages/account";
import { DriverPage, PostRidePage } from "@/pages/driver";
import { BookingsPage, DrivePage } from "@/pages/trips";
import { AdminPage } from "@/pages/admin";
import { LegalPage, MessagesPage } from "@/pages/info";
import { StoreProvider } from "@/store/context";
import "./index.css";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<HomePage />} />
          <Route path="rides" element={<RidesPage />} />
          <Route path="rides/new" element={<PostRidePage />} />
          <Route path="rides/:id" element={<RideDetailPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="verify" element={<VerifyPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="drive" element={<DrivePage />} />
          <Route path="driver" element={<DriverPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="legal" element={<LegalPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("root missing");
createRoot(root).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
