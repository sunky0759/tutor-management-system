-- 创建客服表
CREATE TABLE IF NOT EXISTS customer_service (
    id SERIAL PRIMARY KEY,
    wechat_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建家教信息表
CREATE TABLE IF NOT EXISTS tutor_requests (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    city VARCHAR(50),
    district VARCHAR(50),
    grade_level VARCHAR(50),
    subjects TEXT[], -- 使用数组存储多个科目
    customer_service_id INTEGER REFERENCES customer_service(id),
    is_recommended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tutor_requests_updated_at
    BEFORE UPDATE ON tutor_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 