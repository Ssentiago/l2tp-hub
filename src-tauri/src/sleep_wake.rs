/// Подписка на системные sleep/wake уведомления macOS.
/// Вызывает `on_wake` при пробуждении, `on_sleep` перед уходом в сон.
/// Использует IOKit IORegisterForSystemPower — стабильный C API.
pub fn subscribe_sleep_wake<F, G>(on_sleep: F, on_wake: G)
where
    F: Fn() + Send + 'static,
    G: Fn() + Send + 'static,
{
    #[cfg(target_os = "macos")]
    {
        std::thread::spawn(move || {
            unsafe {
                subscribe_power_notifications(on_sleep, on_wake);
            }
        });
    }
}

#[cfg(target_os = "macos")]
unsafe fn subscribe_power_notifications<F, G>(on_sleep: F, on_wake: G)
where
    F: Fn() + Send + 'static,
    G: Fn() + Send + 'static,
{
    use std::ffi::c_void;

    // Константы из IOKit/pwr_mgt/IOMessage.h
    // iokit_common_msg(x) = (UInt32)(sys_iokit | sub_iokit_common | x)
    // sys_iokit = err_system(0x38) = 0xe0000000, sub_iokit_common = 0
    const K_IO_MESSAGE_CAN_SYSTEM_SLEEP: u32 = 0xe0000270;
    const K_IO_MESSAGE_SYSTEM_WILL_SLEEP: u32 = 0xe0000280;
    const K_IO_MESSAGE_SYSTEM_HAS_POWERED_ON: u32 = 0xe0000300;

    type IONotificationPortRef = *mut c_void;
    type io_connect_t = u32;
    type io_object_t = u32;

    #[link(name = "IOKit", kind = "framework")]
    unsafe extern "C" {
        fn IORegisterForSystemPower(
            refcon: *mut c_void,
            port: *mut IONotificationPortRef,
            callback: extern "C" fn(
                refcon: *mut c_void,
                service: io_connect_t,
                message_type: u32,
                message_data: *mut c_void,
            ),
            notifier: *mut io_object_t,
        ) -> io_object_t;

        fn IOAllowPowerChange(root_port: io_connect_t, message_data: i64);
        fn IONotificationPortGetRunLoopSource(port: IONotificationPortRef) -> *mut c_void;
        fn CFRunLoopAddSource(rl: *mut c_void, source: *mut c_void, mode: *mut c_void);
        fn CFRunLoopRun();
        fn CFRunLoopGetCurrent() -> *mut c_void;
        static kCFRunLoopDefaultMode: *mut c_void;
    }

    struct PowerCallbackData {
        on_sleep: Box<dyn Fn()>,
        on_wake: Box<dyn Fn()>,
        root_port: io_connect_t,
    }

    extern "C" fn power_callback(
        refcon: *mut c_void,
        service: io_connect_t,
        message_type: u32,
        message_data: *mut c_void,
    ) {
        unsafe {
            let data = &*(refcon as *const PowerCallbackData);
            match message_type {
                K_IO_MESSAGE_CAN_SYSTEM_SLEEP => {
                    // Явно разрешаем сон — без этого система может задержать засыпание
                    IOAllowPowerChange(service, message_data as i64);
                }
                K_IO_MESSAGE_SYSTEM_WILL_SLEEP => {
                    (data.on_sleep)();
                    IOAllowPowerChange(service, message_data as i64);
                }
                K_IO_MESSAGE_SYSTEM_HAS_POWERED_ON => {
                    (data.on_wake)();
                }
                _ => {}
            }
        }
    }

    let mut root_port: io_connect_t = 0;
    let mut notifier: io_object_t = 0;

    let callback_data = Box::into_raw(Box::new(PowerCallbackData {
        on_sleep: Box::new(on_sleep),
        on_wake: Box::new(on_wake),
        root_port: 0, // заполним после IORegisterForSystemPower
    }));

    // Временно передаём 0 как root_port, заполним ниже
    let mut notify_port: IONotificationPortRef = std::ptr::null_mut();

    let _result = IORegisterForSystemPower(
        callback_data as *mut c_void,
        &mut notify_port,
        power_callback,
        &mut notifier,
    );

    if notify_port.is_null() {
        eprintln!("[sleep-wake] Failed to register for system power notifications");
        // Освобождаем callback_data чтобы не утекло
        let _ = Box::from_raw(callback_data);
        return;
    }

    // Заполняем root_port в callback_data (IORegisterForSystemPower возвращает его)
    // root_port — это первый аргумент, который мы передали как refcon... 
    // На самом деле IORegisterForSystemPower возвращает io_object_t (notifier),
    // а root_port — это порт, через который отвечают системе.
    // Для IOAllowPowerChange используем service из callback (первый аргумент).

    let run_loop_source = IONotificationPortGetRunLoopSource(notify_port);
    if run_loop_source.is_null() {
        eprintln!("[sleep-wake] Failed to get run loop source");
        let _ = Box::from_raw(callback_data);
        return;
    }

    // CFRunLoopGetCurrent() — текущий поток (spawned thread), НЕ main thread
    let run_loop = CFRunLoopGetCurrent();
    CFRunLoopAddSource(run_loop, run_loop_source, kCFRunLoopDefaultMode);

    eprintln!("[sleep-wake] Subscribed to system power notifications");

    // Блокируемся на run loop — слушаем уведомления в этом потоке
    CFRunLoopRun();

    // Сюда не дойдём (CFRunLoopRun блокирует навсегда),
    // но если придём — утечка callback_data допустима (один раз за жизнь процесса)
    let _ = Box::from_raw(callback_data);
}
