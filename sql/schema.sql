-- WORLD CHAOS — مخطط قاعدة البيانات
-- يتطلب امتداد PostGIS للبيانات الجغرافية

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- المستخدمون
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name VARCHAR(40) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  avatar_url TEXT,
  is_anonymous_default BOOLEAN NOT NULL DEFAULT false,
  locale VARCHAR(10) NOT NULL DEFAULT 'ar',
  theme VARCHAR(10) NOT NULL DEFAULT 'dark',
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- الرسائل الجغرافية
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  text VARCHAR(500) NOT NULL,
  category VARCHAR(20) NOT NULL DEFAULT 'عام'
    CHECK (category IN ('عام','فني','أفكار','أسئلة','عشوائي')),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  visibility VARCHAR(10) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','unlisted')),
  visible_after TIMESTAMPTZ, -- لميزة TIME CAPSULE
  is_removed BOOLEAN NOT NULL DEFAULT false,
  reaction_count INT NOT NULL DEFAULT 0,
  reply_count INT NOT NULL DEFAULT 0,
  reply_to UUID REFERENCES messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_ip_hash TEXT -- هاش فقط، لا نخزن IP الحقيقي أبدًا (للحماية من الإساءة)
);
CREATE INDEX IF NOT EXISTS idx_messages_location ON messages USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_category ON messages (category);

-- التفاعلات (إعجاب/أثر) على الرسائل
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  anon_key TEXT, -- بصمة مجهولة لمنع التكرار دون حساب
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id),
  UNIQUE (message_id, anon_key)
);

-- الرسومات الجغرافية (WORLD CANVAS)
CREATE TABLE IF NOT EXISTS drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  vector_data JSONB NOT NULL, -- مسارات متجهة: [{color,size,points:[{x,y}...]}]
  mode VARCHAR(12) NOT NULL DEFAULT 'normal' CHECK (mode IN ('normal','ghost','live_trace')),
  ghost_lifetime_seconds INT, -- لوضع GHOST INK
  is_removed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drawings_location ON drawings USING GIST (location);

-- الإبلاغات
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('message','drawing')),
  target_id UUID NOT NULL,
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason VARCHAR(300) NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- الحظر بين المستخدمين
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- الأماكن المفضلة
CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(80) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
