import { Routes, Route } from 'react-router';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Products from '@/pages/Products';
import ProductDetail from '@/pages/ProductDetail';
import Search from '@/pages/Search';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import Pay from '@/pages/Pay';
import Orders from '@/pages/Orders';
import OrderDetail from '@/pages/OrderDetail';
import Letters from '@/pages/Letters';
import LetterNew from '@/pages/LetterNew';
import LettersMine from '@/pages/LettersMine';
import LetterDetail from '@/pages/LetterDetail';
import LetterThanks from '@/pages/LetterThanks';
import Stories from '@/pages/Stories';
import About from '@/pages/About';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Admin from '@/pages/Admin';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="search" element={<Search />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="pay/:orderNo" element={<Pay />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="letters" element={<Letters />} />
        <Route path="letters/new" element={<LetterNew />} />
        <Route path="letters/mine" element={<LettersMine />} />
        <Route path="letters/:id" element={<LetterDetail />} />
        <Route path="letters/:id/thanks" element={<LetterThanks />} />
        <Route path="stories" element={<Stories />} />
        <Route path="about" element={<About />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="admin/*" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
