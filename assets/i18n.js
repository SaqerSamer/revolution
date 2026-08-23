(function () {
  const storageKey = 'revolutionLanguage';
  const supportedLanguages = ['en', 'ar', 'ru'];
  const localeByLanguage = {
    en: 'en-GB',
    ar: 'ar-SA',
    ru: 'ru-RU'
  };

  const dictionaries = {
    ar: {
      'REVOLUTION | Once Human Community': 'REVOLUTION | مجتمع Once Human',
      'REVOLUTION — a custom Once Human community server hub for raids, events, rules, squads, and Discord.': 'REVOLUTION — مركز مجتمع مخصص لسيرفر Once Human للرايدات والفعاليات والقوانين والفرق والديسكورد.',
      'Custom Once Human community server — raids, events, squads, and high-stakes survival.': 'سيرفر مجتمع Once Human مخصص — رايدات، فعاليات، فرق، وتحديات نجاة حماسية.',
      'REVOLUTION home': 'الصفحة الرئيسية لـ REVOLUTION',
      'Open menu': 'فتح القائمة',
      'Close menu': 'إغلاق القائمة',
      'Main navigation': 'القائمة الرئيسية',
      'About': 'حول السيرفر',
      'Download': 'تحميل',
      'Events': 'الفعاليات',
      'Support & Feedback': 'الدعم والملاحظات',
      'Rules': 'القوانين',
      'Wipe': 'الوايب',
      'Discord': 'ديسكورد',
      'Background music controls': 'تحكم موسيقى الخلفية',
      'Music volume': 'مستوى صوت الموسيقى',
      'Play background music': 'تشغيل موسيقى الخلفية',
      'Pause background music': 'إيقاف موسيقى الخلفية',
      'Play / pause music': 'تشغيل / إيقاف الموسيقى',
      'Welcome to REVOLUTION': 'أهلاً بك في REVOLUTION',
      'Click anywhere to enter': 'اضغط في أي مكان للدخول',
      'Language selector': 'اختيار اللغة',
      'Custom Once Human Community': 'مجتمع Once Human مخصص',
      'A custom Once Human server built for serious players: raids, squads, events, challenges, clean rules, and a dark tactical atmosphere made for people who want action.': 'سيرفر Once Human مخصص للاعبين الجادين: رايدات، فرق، فعاليات، تحديات، قوانين واضحة، وأجواء تكتيكية حماسية لعشاق الأكشن.',
      'Join Discord': 'ادخل الديسكورد',
      'Read Rules': 'اقرأ القوانين',
      'Server quick info': 'معلومات السيرفر السريعة',
      'Server Status': 'حالة السيرفر',
      'ACTIVE': 'نشط',
      'Mode': 'النمط',
      'Code / IP': 'الكود / الآي بي',
      'checking online': 'يتم فحص المتصلين',
      'bot setup needed': 'يلزم ضبط البوت',
      'online': 'متصل',
      'Revolution supporters': 'داعمو REVOLUTION',
      'SUBSCRIBERS': 'الداعمون',
      'Weekly raids': 'رايدات أسبوعية',
      '⚡ Weekly raids': '⚡ رايدات أسبوعية',
      'Custom events': 'فعاليات مخصصة',
      '◆ Custom events': '◆ فعاليات مخصصة',
      'Squad battles': 'معارك فرق',
      '☣ Squad battles': '☣ معارك فرق',
      'Fair rules': 'قوانين عادلة',
      '◇ Fair rules': '◇ قوانين عادلة',
      'Discord drops': 'دروبات ديسكورد',
      '✦ Discord drops': '✦ دروبات ديسكورد',
      'Welcome to REVOLUTION.': 'أهلاً بك في REVOLUTION.',
      'The ultimate Once Human experience.': 'تجربة Once Human النهائية.',
      'REVOLUTION offers a rebalanced ecosystem built for players who love a real challenge, fair competition, and high-stakes PvP. Our mission is simple: bring back the true spirit of survival.': 'يقدم REVOLUTION نظاماً متوازناً للاعبين الذين يحبون التحدي الحقيقي، المنافسة العادلة، وPvP عالي المخاطر. مهمتنا بسيطة: إعادة روح النجاة الحقيقية.',
      'High-tier gear and rare resources are hard to obtain, meaning every piece of loot you find or craft feels earned, and every upgrade matters. With balanced loot progression, skill, strategy, and teamwork dictate the outcome of battles.': 'المعدات القوية والموارد النادرة صعبة الحصول، لذلك كل لوت تحصل عليه أو تصنعه تشعر أنك استحققته، وكل ترقية لها قيمة. ومع تقدم لوت متوازن، المهارة والاستراتيجية والعمل الجماعي هي التي تحسم القتال.',
      "Are you ready to earn your survival? Join REVOLUTION today and show everyone what you're truly made of.": 'هل أنت جاهز لتستحق نجاتك؟ انضم إلى REVOLUTION اليوم وأرِ الجميع قوتك الحقيقية.',
      'Revolution highlights': 'أبرز مميزات REVOLUTION',
      'Earned Progression': 'تقدم مستحق',
      'Rare loot and high-tier gear matter because every upgrade takes effort.': 'اللوت النادر والمعدات العالية لها قيمة لأن كل تطوير يحتاج جهد.',
      'Fair Competition': 'منافسة عادلة',
      'Balanced progression keeps fights focused on skill, strategy, and teamwork.': 'التقدم المتوازن يجعل القتال يعتمد على المهارة والاستراتيجية والعمل الجماعي.',
      'High-Stakes PvP': 'PvP عالي المخاطر',
      'Every tactical decision counts in intense encounters and epic rivalries.': 'كل قرار تكتيكي مهم في المواجهات القوية والعداوات الملحمية.',
      'Download Game': 'تحميل اللعبة',
      'Start Once Human from your platform.': 'ابدأ Once Human من منصتك.',
      'Pick the launcher you use and jump into REVOLUTION when the game is ready.': 'اختر المنصة التي تستخدمها وادخل REVOLUTION عندما تصبح اللعبة جاهزة.',
      'Download on Steam': 'تحميل من Steam',
      'Once Human official Steam page': 'صفحة Once Human الرسمية على Steam',
      'Get it on Epic Games': 'احصل عليها من Epic Games',
      'Once Human on Epic Games Store': 'Once Human على متجر Epic Games',
      'Download for Phone': 'تحميل للهاتف',
      'Once Human on Google Play': 'Once Human على Google Play',
      'Season Events': 'فعاليات الموسم',
      'Season events with image, details, in-game location, and smart time conversion from Moscow time.': 'فعاليات الموسم مع صورة وتفاصيل وموقع داخل اللعبة وتحويل ذكي من توقيت موسكو.',
      'Season Event': 'فعالية الموسم',
      'No events posted yet.': 'لا توجد فعاليات منشورة حالياً.',
      'Admins can add event slides from the hidden control page.': 'يمكن للإدارة إضافة شرائح الفعاليات من صفحة التحكم المخفية.',
      'Wipe Announcements': 'إعلانات الوايب',
      'All wipe dates, reset details, and updates will be posted in Discord.': 'سيتم نشر جميع تواريخ الوايب وتفاصيل الريست والتحديثات في الديسكورد.',
      'Fresh Progression': 'تقدم جديد',
      'The server wipe keeps PvP, loot, and team progression fair for every player.': 'الوايب يحافظ على عدالة الـ PvP واللوت وتقدم الفرق لكل اللاعبين.',
      'Prepare Early': 'استعد مبكراً',
      'Check the schedule, gather your squad, and be ready for the next fresh start.': 'راجع الجدول، جهز فريقك، وكن مستعداً للبداية الجديدة القادمة.',
      'Next Wipe': 'الوايب القادم',
      'The exact wipe time will be announced on Discord before the reset. Keep an eye on updates so your squad is ready.': 'سيتم إعلان وقت الوايب الدقيق في الديسكورد قبل الريست. تابع التحديثات حتى يكون فريقك جاهزاً.',
      'The next wipe date will be announced on Discord.': 'سيتم إعلان موعد الوايب القادم في الديسكورد.',
      'Start': 'البداية',
      'End': 'النهاية',
      'Countdown': 'العد التنازلي',
      'Need help or want to send feedback?': 'تحتاج مساعدة أو تريد إرسال ملاحظة؟',
      'Open a ticket-style support channel or send feedback straight to the REVOLUTION team.': 'افتح قناة دعم تشبه التكت أو أرسل ملاحظتك مباشرة إلى فريق REVOLUTION.',
      'Support': 'الدعم',
      'Talk to staff': 'تواصل مع الإدارة',
      'Use this channel for server help, player reports, issues, and questions that need staff attention.': 'استخدم هذه القناة لمساعدة السيرفر، بلاغات اللاعبين، المشاكل، والأسئلة التي تحتاج تدخل الإدارة.',
      'Open Support': 'فتح الدعم',
      'Server admins': 'إداريون السيرفر',
      'Admins': 'الإدارة',
      'Loading admins...': 'جاري تحميل الإدارة...',
      'No admins found in the Admin role.': 'لا يوجد إداريون في رتبة Admin.',
      'Enable Server Members Intent to show admins.': 'فعّل Server Members Intent لعرض الإدارة.',
      'Feedback': 'الملاحظات',
      'Send website feedback': 'إرسال ملاحظة للموقع',
      'Name': 'الاسم',
      'Your name': 'اسمك',
      'Message': 'الرسالة',
      'Write your feedback here': 'اكتب ملاحظتك هنا',
      'Send Feedback': 'إرسال الملاحظة',
      'Open Channel': 'فتح القناة',
      'Write your feedback first.': 'اكتب ملاحظتك أولاً.',
      'Sending feedback...': 'جاري إرسال الملاحظة...',
      'Feedback sent to Discord.': 'تم إرسال الملاحظة إلى الديسكورد.',
      'Could not send. Use Open Channel instead.': 'تعذر الإرسال. استخدم فتح القناة بدلاً من ذلك.',
      'REVOLUTION server rules.': 'قوانين سيرفر REVOLUTION.',
      'Teaming And Alliance Rules': 'قوانين التحالف والتعاون الممنوع',
      'Teaming is strictly prohibited. Teaming means actively choosing not to engage or kill an enemy player from a different Hive when you have a clear opportunity to do so.': 'التعاون الممنوع محظور تماماً. ويعني أن تختار عدم مهاجمة أو قتل لاعب عدو من Hive مختلف عندما تكون لديك فرصة واضحة لفعل ذلك.',
      'No temporary alliances in combat. Forming temporary alliances during active fights, including teaming up mid-combat against a player you dislike, is not allowed.': 'التحالفات المؤقتة أثناء القتال ممنوعة. تكوين تحالف أثناء قتال نشط ضد لاعب لا تحبه غير مسموح.',
      'No team swapping for advantages. Leaving and rejoining teams to gain an advantage is not permitted.': 'تبديل الفرق للحصول على أفضلية ممنوع. الخروج والعودة للفرق لكسب أفضلية غير مسموح.',
      'No exceeding team limits. Teaming beyond the allowed player limit is strictly forbidden.': 'تجاوز حد الفريق ممنوع. التعاون بعدد أكبر من الحد المسموح محظور تماماً.',
      'No switching partners for advantages. Switching partners to gain an advantage is prohibited.': 'تبديل الشركاء للحصول على أفضلية ممنوع.',
      'You are allowed to switch teams one time per wipe for any reason. If you need to switch again, you must notify the admins.': 'يسمح لك بتغيير الفريق مرة واحدة فقط في كل وايب لأي سبب. إذا احتجت للتغيير مرة أخرى يجب إبلاغ الإدارة.',
      'Rule violation penalties': 'عقوبات مخالفة القوانين',
      '1st offense: Warning.': 'المخالفة الأولى: تحذير.',
      '2nd offense: 6-hour ban.': 'المخالفة الثانية: حظر 6 ساعات.',
      '3rd offense: 6-hour ban + character progress reset.': 'المخالفة الثالثة: حظر 6 ساعات + تصفير تقدم الشخصية.',
      'Trading': 'التجارة',
      'Opposing parties may transfer goods between players outside their Hive only if it happens in safe areas through the trading system.': 'يمكن للأطراف المتخاصمة نقل الأغراض بين لاعبين خارج الـ Hive فقط إذا تم ذلك في مناطق آمنة عبر نظام التجارة.',
      'Personal vending machines are allowed, but server staff are not responsible for lost goods if the vending machine is raided.': 'آلات البيع الشخصية مسموحة، لكن إدارة السيرفر غير مسؤولة عن خسارة الأغراض إذا تم مداهمة الآلة.',
      'Chat And Community Behavior': 'الدردشة وسلوك المجتمع',
      'The game can become toxic sometimes, but everyone is expected to keep a respectful attitude.': 'قد تصبح اللعبة سامة أحياناً، لكن نتوقع من الجميع الحفاظ على الاحترام.',
      'No harassment in game chat or Discord. Proof may be required.': 'التحرش أو المضايقة في شات اللعبة أو الديسكورد ممنوعة. قد يُطلب دليل.',
      'Spreading false information about REVOLUTION is not allowed.': 'نشر معلومات كاذبة عن REVOLUTION غير مسموح.',
      'Promoting or discussing other servers is not allowed.': 'الترويج أو النقاش عن سيرفرات أخرى غير مسموح.',
      'Depending on the gravity of the situation: server mute for a period of time, warning, temporary or permanent Discord server ban, or temporary or permanent game server ban.': 'حسب خطورة الحالة: ميوت في السيرفر لفترة، تحذير، حظر مؤقت أو دائم من الديسكورد، أو حظر مؤقت أو دائم من سيرفر اللعبة.',
      'Bugs': 'الأخطاء',
      'Using any type of bug is strictly forbidden. It will result in a permanent ban + character deletion.': 'استخدام أي نوع من الأخطاء ممنوع تماماً وسيؤدي إلى حظر دائم + حذف الشخصية.',
      'Building • Bugs • Cheating': 'البناء • الأخطاء • الغش',
      'Once Human REVOLUTION is still being improved. Please report bugs so we can make the server better together.': 'Once Human REVOLUTION ما زال قيد التحسين. يرجى الإبلاغ عن الأخطاء لنحسن السيرفر معاً.',
      'Build': 'البناء',
      'Do not glitch foundations into terrain, textures, or terminals. Using terrain or elevation exploits for unfair defense is strictly prohibited.': 'لا تستخدم ثغرات لإدخال الأساسات داخل الأرض أو الخامات أو التيرمنال. استغلال التضاريس للدفاع غير العادل ممنوع تماماً.',
      'Bases': 'القواعد',
      'No glitched or buggy bases. Stacked foundations, clipping structures into map textures, or hiding the territory terminal inside foundations is strictly forbidden.': 'القواعد المليئة بالثغرات ممنوعة. تكديس الأساسات أو إدخال المباني داخل خامات الخريطة أو إخفاء التيرمنال داخل الأساسات ممنوع تماماً.',
      'Limits': 'الحدود',
      'No territory or limit exploits. Merging territories to bypass building or turret limits is considered bug abuse.': 'استغلال حدود المناطق ممنوع. دمج الأراضي لتجاوز حدود البناء أو التوريتات يعتبر إساءة استخدام للأخطاء.',
      'Wipe progression deleted.': 'حذف تقدم الوايب.',
      '6-hour ban.': 'حظر 6 ساعات.',
      'Building Areas': 'مناطق البناء',
      'Building outside permitted areas is not allowed.': 'البناء خارج المناطق المسموحة غير مسموح.',
      'Daily Kit And Weekly Kit': 'الكيت اليومي والأسبوعي',
      'The REVOLUTION custom server shopping system uses Starchrom to purchase specialized progression kits.': 'نظام متجر سيرفر REVOLUTION يستخدم Starchrom لشراء كيتات تقدم مخصصة.',
      'Kits': 'الكيتات',
      'Available kits can be purchased from the game shop.': 'يمكن شراء الكيتات المتاحة من متجر اللعبة.',
      'Currency': 'العملة',
      'Admin staff will frequently send Starchrom directly to players.': 'سترسل الإدارة Starchrom للاعبين بشكل متكرر.',
      'Delivery': 'التسليم',
      'Check your in-game mailbox and claim your Starchrom.': 'تحقق من بريدك داخل اللعبة واستلم الـ Starchrom.',
      'Player Names': 'أسماء اللاعبين',
      'Unreadable or strange names are not allowed, including names using Chinese or Japanese characters.': 'الأسماء غير المقروءة أو الغريبة غير مسموحة، بما فيها الأسماء التي تستخدم أحرفاً صينية أو يابانية.',
      'Impersonating yourself as a cheater or admin will result in a permanent ban + character deletion.': 'انتحال صفة غشاش أو إداري سيؤدي إلى حظر دائم + حذف الشخصية.',
      'Meteor Car': 'سيارة Meteor',
      'The METEOR CAR cannot be used for raids.': 'لا يمكن استخدام سيارة METEOR في الرايدات.',
      'Staff Rules': 'قوانين الإدارة',
      'Staff members must always remain fair and neutral.': 'يجب على أعضاء الإدارة البقاء عادلين ومحايدين دائماً.',
      'No interference. Staff must not interfere in player fights.': 'ممنوع التدخل. لا يجب على الإدارة التدخل في قتالات اللاعبين.',
      'Base locations. Staff must never reveal or hint at player base locations.': 'مواقع القواعد. لا يجوز للإدارة كشف أو التلميح إلى مواقع قواعد اللاعبين.',
      'Ready?': 'جاهز؟',
      'Enter the fire. Respect the system.': 'ادخل النار. احترم النظام.',
      'Join our active community, gather your squad, and conquer Once Human REVOLUTION.': 'انضم إلى مجتمعنا النشط، جهز فريقك، وسيطر على Once Human REVOLUTION.',
      'Join REVOLUTION': 'انضم إلى REVOLUTION',
      'REVOLUTION — Server is kept alive by VIVI - Website is powered by Alamouri © 26ECU - 2026. All rights and wrongs reserved.': 'REVOLUTION — السيرفر يبقى حياً بفضل VIVI - الموقع يعمل بواسطة Alamouri © 26ECU - 2026. كل الحقوق والأخطاء محفوظة.',
      'Gold supporters coming soon': 'الداعمون الذهبيون قريباً',
      'Support the server': 'ادعم السيرفر',
      'TBA': 'قريباً',
      'Live': 'مباشر',
      'Event': 'فعالية',
      'Event details will be announced soon.': 'سيتم إعلان تفاصيل الفعالية قريباً.',
      'Moscow': 'موسكو',
      'Saudi': 'السعودية',
      'UTC': 'UTC',
      'Location': 'الموقع',
      'REVOLUTION': 'REVOLUTION',
      'COPIED': 'تم النسخ',
      'COPY FAILED': 'فشل النسخ',
      'd': 'يوم',
      'h': 'ساعة',
      'm': 'دقيقة'
    },
    ru: {
      'REVOLUTION | Once Human Community': 'REVOLUTION | Сообщество Once Human',
      'REVOLUTION — a custom Once Human community server hub for raids, events, rules, squads, and Discord.': 'REVOLUTION — центр пользовательского сервера Once Human для рейдов, событий, правил, отрядов и Discord.',
      'Custom Once Human community server — raids, events, squads, and high-stakes survival.': 'Пользовательский сервер сообщества Once Human — рейды, события, отряды и выживание с высокими ставками.',
      'REVOLUTION home': 'Главная REVOLUTION',
      'Open menu': 'Открыть меню',
      'Close menu': 'Закрыть меню',
      'Main navigation': 'Главная навигация',
      'About': 'О сервере',
      'Download': 'Скачать',
      'Events': 'События',
      'Support & Feedback': 'Поддержка и отзывы',
      'Rules': 'Правила',
      'Wipe': 'Вайп',
      'Discord': 'Discord',
      'Background music controls': 'Управление фоновой музыкой',
      'Music volume': 'Громкость музыки',
      'Play background music': 'Включить фоновую музыку',
      'Pause background music': 'Поставить музыку на паузу',
      'Play / pause music': 'Включить / поставить музыку на паузу',
      'Welcome to REVOLUTION': 'Добро пожаловать в REVOLUTION',
      'Click anywhere to enter': 'Нажмите в любом месте, чтобы войти',
      'Language selector': 'Выбор языка',
      'Custom Once Human Community': 'Пользовательское сообщество Once Human',
      'A custom Once Human server built for serious players: raids, squads, events, challenges, clean rules, and a dark tactical atmosphere made for people who want action.': 'Пользовательский сервер Once Human для серьезных игроков: рейды, отряды, события, испытания, честные правила и темная тактическая атмосфера для тех, кто хочет экшена.',
      'Join Discord': 'Войти в Discord',
      'Read Rules': 'Читать правила',
      'Server quick info': 'Краткая информация о сервере',
      'Server Status': 'Статус сервера',
      'ACTIVE': 'Активен',
      'Mode': 'Режим',
      'Code / IP': 'Код / IP',
      'checking online': 'проверка онлайна',
      'bot setup needed': 'нужна настройка бота',
      'online': 'онлайн',
      'Revolution supporters': 'Поддержавшие REVOLUTION',
      'SUBSCRIBERS': 'ПОДПИСЧИКИ',
      'Weekly raids': 'Еженедельные рейды',
      '⚡ Weekly raids': '⚡ Еженедельные рейды',
      'Custom events': 'Пользовательские события',
      '◆ Custom events': '◆ Пользовательские события',
      'Squad battles': 'Бои отрядов',
      '☣ Squad battles': '☣ Бои отрядов',
      'Fair rules': 'Честные правила',
      '◇ Fair rules': '◇ Честные правила',
      'Discord drops': 'Discord-дропы',
      '✦ Discord drops': '✦ Discord-дропы',
      'Welcome to REVOLUTION.': 'Добро пожаловать в REVOLUTION.',
      'The ultimate Once Human experience.': 'Максимальный опыт Once Human.',
      'REVOLUTION offers a rebalanced ecosystem built for players who love a real challenge, fair competition, and high-stakes PvP. Our mission is simple: bring back the true spirit of survival.': 'REVOLUTION предлагает заново сбалансированную экосистему для игроков, которые любят настоящий вызов, честную конкуренцию и PvP с высокими ставками. Наша миссия проста: вернуть настоящий дух выживания.',
      'High-tier gear and rare resources are hard to obtain, meaning every piece of loot you find or craft feels earned, and every upgrade matters. With balanced loot progression, skill, strategy, and teamwork dictate the outcome of battles.': 'Топовое снаряжение и редкие ресурсы получить сложно, поэтому каждая найденная или созданная вещь ощущается заслуженной, а каждое улучшение имеет значение. При сбалансированном прогрессе исход боев решают навык, стратегия и командная работа.',
      "Are you ready to earn your survival? Join REVOLUTION today and show everyone what you're truly made of.": 'Готовы заслужить свое выживание? Присоединяйтесь к REVOLUTION и покажите всем, на что вы способны.',
      'Revolution highlights': 'Преимущества REVOLUTION',
      'Earned Progression': 'Заслуженный прогресс',
      'Rare loot and high-tier gear matter because every upgrade takes effort.': 'Редкая добыча и топовое снаряжение ценны, потому что каждое улучшение требует усилий.',
      'Fair Competition': 'Честная конкуренция',
      'Balanced progression keeps fights focused on skill, strategy, and teamwork.': 'Сбалансированный прогресс делает бои зависимыми от навыка, стратегии и командной работы.',
      'High-Stakes PvP': 'PvP с высокими ставками',
      'Every tactical decision counts in intense encounters and epic rivalries.': 'Каждое тактическое решение важно в напряженных столкновениях и эпичных противостояниях.',
      'Download Game': 'Скачать игру',
      'Start Once Human from your platform.': 'Запустите Once Human на своей платформе.',
      'Pick the launcher you use and jump into REVOLUTION when the game is ready.': 'Выберите свой лаунчер и заходите в REVOLUTION, когда игра будет готова.',
      'Download on Steam': 'Скачать в Steam',
      'Once Human official Steam page': 'Официальная страница Once Human в Steam',
      'Get it on Epic Games': 'Получить в Epic Games',
      'Once Human on Epic Games Store': 'Once Human в Epic Games Store',
      'Download for Phone': 'Скачать на телефон',
      'Once Human on Google Play': 'Once Human в Google Play',
      'Season Events': 'События сезона',
      'Season events with image, details, in-game location, and smart time conversion from Moscow time.': 'События сезона с изображением, деталями, локацией в игре и умным переводом времени из московского часового пояса.',
      'Season Event': 'Событие сезона',
      'No events posted yet.': 'События пока не опубликованы.',
      'Admins can add event slides from the hidden control page.': 'Админы могут добавлять слайды событий со скрытой панели управления.',
      'Wipe Announcements': 'Объявления о вайпе',
      'All wipe dates, reset details, and updates will be posted in Discord.': 'Все даты вайпа, детали сброса и обновления будут опубликованы в Discord.',
      'Fresh Progression': 'Свежий прогресс',
      'The server wipe keeps PvP, loot, and team progression fair for every player.': 'Вайп сервера сохраняет честность PvP, добычи и командного прогресса для каждого игрока.',
      'Prepare Early': 'Готовьтесь заранее',
      'Check the schedule, gather your squad, and be ready for the next fresh start.': 'Проверьте расписание, соберите отряд и будьте готовы к новому старту.',
      'Next Wipe': 'Следующий вайп',
      'The exact wipe time will be announced on Discord before the reset. Keep an eye on updates so your squad is ready.': 'Точное время вайпа будет объявлено в Discord перед сбросом. Следите за обновлениями, чтобы ваш отряд был готов.',
      'The next wipe date will be announced on Discord.': 'Дата следующего вайпа будет объявлена в Discord.',
      'Start': 'Начало',
      'End': 'Конец',
      'Countdown': 'Обратный отсчет',
      'Need help or want to send feedback?': 'Нужна помощь или хотите оставить отзыв?',
      'Open a ticket-style support channel or send feedback straight to the REVOLUTION team.': 'Откройте канал поддержки в стиле тикета или отправьте отзыв прямо команде REVOLUTION.',
      'Support': 'Поддержка',
      'Talk to staff': 'Связаться с администрацией',
      'Use this channel for server help, player reports, issues, and questions that need staff attention.': 'Используйте этот канал для помощи по серверу, жалоб на игроков, проблем и вопросов, требующих внимания администрации.',
      'Open Support': 'Открыть поддержку',
      'Server admins': 'Администраторы сервера',
      'Admins': 'Админы',
      'Loading admins...': 'Загрузка админов...',
      'No admins found in the Admin role.': 'Админы с ролью Admin не найдены.',
      'Enable Server Members Intent to show admins.': 'Включите Server Members Intent, чтобы показать админов.',
      'Feedback': 'Отзывы',
      'Send website feedback': 'Отправить отзыв о сайте',
      'Name': 'Имя',
      'Your name': 'Ваше имя',
      'Message': 'Сообщение',
      'Write your feedback here': 'Напишите ваш отзыв здесь',
      'Send Feedback': 'Отправить отзыв',
      'Open Channel': 'Открыть канал',
      'Write your feedback first.': 'Сначала напишите отзыв.',
      'Sending feedback...': 'Отправка отзыва...',
      'Feedback sent to Discord.': 'Отзыв отправлен в Discord.',
      'Could not send. Use Open Channel instead.': 'Не удалось отправить. Используйте кнопку открытия канала.',
      'REVOLUTION server rules.': 'Правила сервера REVOLUTION.',
      'Teaming And Alliance Rules': 'Правила тиминга и союзов',
      'Teaming is strictly prohibited. Teaming means actively choosing not to engage or kill an enemy player from a different Hive when you have a clear opportunity to do so.': 'Тиминг строго запрещен. Это означает намеренный отказ атаковать или убить вражеского игрока из другого Hive, когда у вас есть очевидная возможность.',
      'No temporary alliances in combat. Forming temporary alliances during active fights, including teaming up mid-combat against a player you dislike, is not allowed.': 'Временные союзы в бою запрещены. Нельзя объединяться во время активного боя, включая совместную атаку игрока, который вам не нравится.',
      'No team swapping for advantages. Leaving and rejoining teams to gain an advantage is not permitted.': 'Смена команды ради преимущества запрещена. Нельзя выходить и возвращаться в команды, чтобы получить выгоду.',
      'No exceeding team limits. Teaming beyond the allowed player limit is strictly forbidden.': 'Превышение лимита команды запрещено. Тиминг сверх разрешенного лимита игроков строго запрещен.',
      'No switching partners for advantages. Switching partners to gain an advantage is prohibited.': 'Смена партнеров ради преимущества запрещена.',
      'You are allowed to switch teams one time per wipe for any reason. If you need to switch again, you must notify the admins.': 'Вы можете сменить команду один раз за вайп по любой причине. Если нужно сменить снова, необходимо уведомить админов.',
      'Rule violation penalties': 'Наказания за нарушение правил',
      '1st offense: Warning.': 'Первое нарушение: предупреждение.',
      '2nd offense: 6-hour ban.': 'Второе нарушение: бан на 6 часов.',
      '3rd offense: 6-hour ban + character progress reset.': 'Третье нарушение: бан на 6 часов + сброс прогресса персонажа.',
      'Trading': 'Торговля',
      'Opposing parties may transfer goods between players outside their Hive only if it happens in safe areas through the trading system.': 'Противоборствующие стороны могут передавать товары игрокам вне своего Hive только в безопасных зонах через систему торговли.',
      'Personal vending machines are allowed, but server staff are not responsible for lost goods if the vending machine is raided.': 'Личные торговые автоматы разрешены, но администрация не отвечает за потерянные товары, если автомат был зарейжен.',
      'Chat And Community Behavior': 'Чат и поведение в сообществе',
      'The game can become toxic sometimes, but everyone is expected to keep a respectful attitude.': 'Игра иногда может становиться токсичной, но от всех ожидается уважительное поведение.',
      'No harassment in game chat or Discord. Proof may be required.': 'Домогательства и травля в игровом чате или Discord запрещены. Может потребоваться доказательство.',
      'Spreading false information about REVOLUTION is not allowed.': 'Распространение ложной информации о REVOLUTION запрещено.',
      'Promoting or discussing other servers is not allowed.': 'Реклама или обсуждение других серверов запрещены.',
      'Depending on the gravity of the situation: server mute for a period of time, warning, temporary or permanent Discord server ban, or temporary or permanent game server ban.': 'В зависимости от тяжести ситуации: мут на сервере на определенный срок, предупреждение, временный или постоянный бан в Discord, либо временный или постоянный бан на игровом сервере.',
      'Bugs': 'Баги',
      'Using any type of bug is strictly forbidden. It will result in a permanent ban + character deletion.': 'Использование любых багов строго запрещено. Это приведет к постоянному бану + удалению персонажа.',
      'Building • Bugs • Cheating': 'Строительство • баги • читы',
      'Once Human REVOLUTION is still being improved. Please report bugs so we can make the server better together.': 'Once Human REVOLUTION все еще улучшается. Пожалуйста, сообщайте о багах, чтобы мы вместе сделали сервер лучше.',
      'Build': 'Строительство',
      'Do not glitch foundations into terrain, textures, or terminals. Using terrain or elevation exploits for unfair defense is strictly prohibited.': 'Не встраивайте фундаменты в рельеф, текстуры или терминалы. Использование рельефа или высоты для нечестной защиты строго запрещено.',
      'Bases': 'Базы',
      'No glitched or buggy bases. Stacked foundations, clipping structures into map textures, or hiding the territory terminal inside foundations is strictly forbidden.': 'Базы с багами запрещены. Наложенные фундаменты, встраивание построек в текстуры карты или скрытие территориального терминала внутри фундаментов строго запрещены.',
      'Limits': 'Лимиты',
      'No territory or limit exploits. Merging territories to bypass building or turret limits is considered bug abuse.': 'Эксплойты территорий или лимитов запрещены. Объединение территорий для обхода лимитов строительства или турелей считается злоупотреблением багом.',
      'Wipe progression deleted.': 'Прогресс вайпа удаляется.',
      '6-hour ban.': 'Бан на 6 часов.',
      'Building Areas': 'Зоны строительства',
      'Building outside permitted areas is not allowed.': 'Строительство вне разрешенных зон запрещено.',
      'Daily Kit And Weekly Kit': 'Ежедневный и еженедельный набор',
      'The REVOLUTION custom server shopping system uses Starchrom to purchase specialized progression kits.': 'Магазин пользовательского сервера REVOLUTION использует Starchrom для покупки специальных наборов прогресса.',
      'Kits': 'Наборы',
      'Available kits can be purchased from the game shop.': 'Доступные наборы можно купить в игровом магазине.',
      'Currency': 'Валюта',
      'Admin staff will frequently send Starchrom directly to players.': 'Администрация будет часто отправлять Starchrom игрокам напрямую.',
      'Delivery': 'Доставка',
      'Check your in-game mailbox and claim your Starchrom.': 'Проверьте внутриигровую почту и заберите Starchrom.',
      'Player Names': 'Имена игроков',
      'Unreadable or strange names are not allowed, including names using Chinese or Japanese characters.': 'Нечитаемые или странные имена запрещены, включая имена с китайскими или японскими символами.',
      'Impersonating yourself as a cheater or admin will result in a permanent ban + character deletion.': 'Выдача себя за читера или админа приведет к постоянному бану + удалению персонажа.',
      'Meteor Car': 'Meteor Car',
      'The METEOR CAR cannot be used for raids.': 'METEOR CAR нельзя использовать для рейдов.',
      'Staff Rules': 'Правила персонала',
      'Staff members must always remain fair and neutral.': 'Сотрудники должны всегда оставаться честными и нейтральными.',
      'No interference. Staff must not interfere in player fights.': 'Без вмешательства. Персонал не должен вмешиваться в бои игроков.',
      'Base locations. Staff must never reveal or hint at player base locations.': 'Местоположение баз. Персонал никогда не должен раскрывать или намекать на местоположение баз игроков.',
      'Ready?': 'Готовы?',
      'Enter the fire. Respect the system.': 'Войдите в огонь. Уважайте систему.',
      'Join our active community, gather your squad, and conquer Once Human REVOLUTION.': 'Присоединяйтесь к нашему активному сообществу, соберите свой отряд и покорите Once Human REVOLUTION.',
      'Join REVOLUTION': 'Войти в REVOLUTION',
      'REVOLUTION — Server is kept alive by VIVI - Website is powered by Alamouri © 26ECU - 2026. All rights and wrongs reserved.': 'REVOLUTION — сервер поддерживается VIVI - сайт работает на Alamouri © 26ECU - 2026. Все права и ошибки защищены.',
      'Gold supporters coming soon': 'Золотые сторонники скоро',
      'Support the server': 'Поддержать сервер',
      'TBA': 'Скоро',
      'Live': 'В эфире',
      'Event': 'Событие',
      'Event details will be announced soon.': 'Подробности события будут объявлены скоро.',
      'Moscow': 'Москва',
      'Saudi': 'Саудовская Аравия',
      'UTC': 'UTC',
      'Location': 'Локация',
      'REVOLUTION': 'REVOLUTION',
      'COPIED': 'СКОПИРОВАНО',
      'COPY FAILED': 'НЕ УДАЛОСЬ СКОПИРОВАТЬ',
      'd': 'д',
      'h': 'ч',
      'm': 'мин'
    }
  };

  const textBindings = [];
  const attrBindings = [];
  const boundTextNodes = new WeakSet();
  const boundAttrs = new WeakSet();
  let activeLanguage = readStoredLanguage();

  function readStoredLanguage() {
    try {
      const stored = localStorage.getItem(storageKey);
      return supportedLanguages.includes(stored) ? stored : 'en';
    } catch {
      return 'en';
    }
  }

  function normalize(value) {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function hasTranslation(key) {
    return Object.values(dictionaries).some((dictionary) => Object.prototype.hasOwnProperty.call(dictionary, key));
  }

  function t(key, language = activeLanguage) {
    return dictionaries[language]?.[key] || key;
  }

  function bindTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        const key = normalize(node.nodeValue);
        return key && hasTranslation(key) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    let node = walker.nextNode();
    while (node) {
      if (!boundTextNodes.has(node)) {
        const key = normalize(node.nodeValue);
        const match = node.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
        textBindings.push({
          node,
          key,
          before: match?.[1] || '',
          after: match?.[3] || ''
        });
        boundTextNodes.add(node);
      }
      node = walker.nextNode();
    }
  }

  function bindAttributes(root) {
    const attributes = ['placeholder', 'aria-label', 'title', 'content'];
    root.querySelectorAll('*').forEach((element) => {
      attributes.forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const key = normalize(element.getAttribute(attribute));
        if (!key || !hasTranslation(key)) return;

        const attrKey = `${attribute}:${key}`;
        if (!boundAttrs.has(element)) {
          boundAttrs.add(element);
        }

        attrBindings.push({ element, attribute, key: attrKey, sourceKey: key });
      });
    });
  }

  function refreshLanguageButtons() {
    document.querySelectorAll('[data-lang-choice]').forEach((button) => {
      const isActive = button.dataset.langChoice === activeLanguage;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function applyLanguage(language = activeLanguage) {
    activeLanguage = supportedLanguages.includes(language) ? language : 'en';
    document.documentElement.lang = activeLanguage;
    document.documentElement.dir = 'ltr';
    document.body.classList.toggle('lang-ar', activeLanguage === 'ar');
    document.body.classList.toggle('lang-ru', activeLanguage === 'ru');

    textBindings.forEach((binding) => {
      binding.node.nodeValue = `${binding.before}${t(binding.key)}${binding.after}`;
    });

    attrBindings.forEach((binding) => {
      binding.element.setAttribute(binding.attribute, t(binding.sourceKey));
    });

    document.title = t('REVOLUTION | Once Human Community');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('REVOLUTION — a custom Once Human community server hub for raids, events, rules, squads, and Discord.'));
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', t('Custom Once Human community server — raids, events, squads, and high-stakes survival.'));
    refreshLanguageButtons();
  }

  function setLanguage(language) {
    if (!supportedLanguages.includes(language)) return;
    activeLanguage = language;
    try {
      localStorage.setItem(storageKey, activeLanguage);
    } catch {}
    applyLanguage(activeLanguage);
    window.dispatchEvent(new CustomEvent('raidzone:languagechange', { detail: { language: activeLanguage } }));
  }

  function init() {
    bindTextNodes(document.body);
    bindAttributes(document.body);
    document.querySelectorAll('[data-lang-choice]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setLanguage(button.dataset.langChoice);
      });
    });
    applyLanguage(activeLanguage);
  }

  window.raidzoneI18n = {
    init,
    t,
    setLanguage,
    applyLanguage,
    getLanguage: () => activeLanguage,
    getLocale: () => localeByLanguage[activeLanguage] || 'en-GB'
  };
})();
