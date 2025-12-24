import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import {
  DashboardPage,
  BusinessesPage,
  CreateBusinessPage,
  BusinessDetailPage,
} from './pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path='/' element={<DashboardPage />} />
          <Route path='/businesses' element={<BusinessesPage />} />
          <Route path='/businesses/new' element={<CreateBusinessPage />} />
          <Route path='/businesses/:id' element={<BusinessDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
