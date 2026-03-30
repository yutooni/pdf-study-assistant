# Architecture Rules

## 依存関係
- presentation -> usecase はOK
- usecase -> domain はOK
- domain -> 他の層はNG

## 禁止
- domainからinfraへの依存
- domainでの外部I/O