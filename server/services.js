module.exports = [
  {
    id: "tongzhen",
    name: "通侦系统",
    description: "通侦系统项目aaa",
    webUrl: "http://127.0.0.1:9111",
    services: [
      {
        id: "tongzhen-dev",
        category: "web",
        name: "通侦-开发分支",
        listen: 9111,
        start: "C:\\Users\\Administrator\\Desktop\\web-dev\\start.bat",
        description: "开发环境前端服务"
      }
    ]
  },
  {
    id: "my-project",
    name: "我的项目",
    description: "测试项目",
    webUrl: "http://localhost:3000",
    services: [
      {
        id: "my-web",
        category: "web",
        name: "前端服务",
        listen: 3000,
        start: "C:\\path\\to\\start.bat",
        webUrl: "http://localhost:3000",
        description: "Web前端"
      },
      {
        id: "my-backend",
        category: "java",
        name: "后端服务",
        listen: 8080,
        start: "C:\\path\\to\\start-java.bat",
        description: "Java后端API"
      }
    ]
  }
]