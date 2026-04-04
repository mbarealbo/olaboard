/*
  # Create Olaboard schema

  1. New Tables
    - `canvases`
      - `id` (uuid, primary key)
      - `name` (text, default 'Nuova lavagna')
      - `parent_id` (uuid, self-referencing for nested canvases)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
    - `cards`
      - `id` (uuid, primary key)
      - `canvas_id` (uuid, references canvases)
      - `title` (text, default 'Senza titolo')
      - `body` (text, default empty)
      - `x` (float, position)
      - `y` (float, position)
      - `is_folder` (boolean, default false)
      - `node_type` (text, default 'postit') - 'postit', 'folder', or 'text'
      - `created_at` (timestamptz)
    - `connections`
      - `id` (uuid, primary key)
      - `canvas_id` (uuid, references canvases)
      - `from_card_id` (uuid, references cards)
      - `to_card_id` (uuid, references cards)
      - `label` (text, default empty)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Policies restrict access to own data via auth.uid()
*/

CREATE TABLE IF NOT EXISTS canvases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Nuova lavagna',
  parent_id uuid REFERENCES canvases(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id uuid REFERENCES canvases(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Senza titolo',
  body text NOT NULL DEFAULT '',
  x float NOT NULL DEFAULT 0,
  y float NOT NULL DEFAULT 0,
  is_folder boolean NOT NULL DEFAULT false,
  node_type text NOT NULL DEFAULT 'postit',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id uuid REFERENCES canvases(id) ON DELETE CASCADE NOT NULL,
  from_card_id uuid REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  to_card_id uuid REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own canvases"
  ON canvases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own canvases"
  ON canvases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own canvases"
  ON canvases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own canvases"
  ON canvases FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own cards"
  ON cards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = cards.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own cards"
  ON cards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = cards.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own cards"
  ON cards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = cards.canvas_id
      AND canvases.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = cards.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own cards"
  ON cards FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = cards.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read own connections"
  ON connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = connections.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own connections"
  ON connections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = connections.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own connections"
  ON connections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = connections.canvas_id
      AND canvases.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = connections.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own connections"
  ON connections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = connections.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );
