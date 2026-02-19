```
php8.3 -d ffi.enable=1 -S localhost:8000
```


```
sudo apt-get update && sudo apt-get install -y software-properties-common ca-certificates lsb-release
sudo add-apt-repository -y ppa:ondrej/php
sudo apt-get update && sudo apt-get install -y php8.3 php8.3-cli php8.3-ffi php8.3-bcmath
```

```
printf '\n' | php8.3 vendor/bin/install-c-lib
```
