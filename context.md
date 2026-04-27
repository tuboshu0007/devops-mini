使用nodejs+vue3开发一个DevOps-Mini，要求页面简洁、美观，系统具体功能如下：
1、可以前端、java、go等其他服务运行状态进行实时监控
2、支持对任何一个服务进行开启、停止、重启等操作
3、服务是通过json文件进行配置的，下面一个基本服务配置：
```
 interface ServiceItem {
    id: string; // 服务唯一id
    category: 'web' | 'java' | 'go' | 'node',
    webUrl?:string; // 服务对应的前端地址(非必填，仅限前端服务)
    name:string; // 服务名称
    listen: number; // 监听端口
    start: string; // 启动bat路径
    restart?: string; // 重启bat路径(如果没传，默认先执行stop，后start)
    stop?: string; // 停止bat路径(如果stop没传，支持通过listen的端口来关闭对应的服务)
 }
```


