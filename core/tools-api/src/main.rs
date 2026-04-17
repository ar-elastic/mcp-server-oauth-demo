use axum::{routing::post, Json, Router};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct AddRequest {
    a: i32,
    b: i32,
}

#[derive(Serialize)]
struct AddResponse {
    result: i32,
}

async fn add(Json(payload): Json<AddRequest>) -> Json<AddResponse> {
    Json(AddResponse {
        result: payload.a + payload.b,
    })
}

#[derive(Serialize)]
struct TimeResponse {
    time: String,
}

async fn get_time() -> Json<TimeResponse> {
    Json(TimeResponse {
        time: chrono::Utc::now().to_rfc3339(),
    })
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/tool/add", post(add))
        .route("/tool/time", post(get_time));

    println!("Tools API running on http://localhost:4000");

    axum::serve(
        tokio::net::TcpListener::bind("127.0.0.1:4000").await.unwrap(),
        app,
    )
    .await
    .unwrap();
}