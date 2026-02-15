
-- Add settings columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS shopee_commission numeric NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS fixed_fee numeric NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_packaging_cost numeric NOT NULL DEFAULT 0;

-- Create products table
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create product_sizes table (the grade)
CREATE TABLE public.product_sizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  size_label text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own product_sizes" ON public.product_sizes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own product_sizes" ON public.product_sizes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own product_sizes" ON public.product_sizes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own product_sizes" ON public.product_sizes FOR DELETE USING (auth.uid() = user_id);
