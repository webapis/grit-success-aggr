
//https://claude.ai/chat/41183548-0b3b-4b2c-923a-0807550735b5
import { JSDOM }  from 'jsdom'; // For Node.js; omit if running in a browser

/**
 * Identifies product containers in e-commerce HTML content
 * @param {string} htmlContent - The HTML content to analyze
 * @returns {Object|null} - Container information or null if not found
 */
function identifyProductContainer(htmlContent) {
  // Parse HTML content into a DOM
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // Helper function to check if an element contains price-like content
  function isPriceElement(element) {
    const text = element.textContent.toLowerCase().trim();
    // Matches prices like $99.99, 99.99 TL, €50.00, etc.
    const pricePattern = /[\$€£₺¥]?\s*\d+([.,]\d{1,2})?\s*(tl|usd|eur|gbp|try|jpy)?/;
    return pricePattern.test(text) || 
           text.includes('price') || 
           text.includes('fiyat') || 
           text.includes('cost') ||
           text.includes('₺') ||
           text.includes('lira');
  }

  // Helper function to check if an element is likely a product title
  function isTitleElement(element) {
    const text = element.textContent.trim();
    return text.length > 5 && // Titles are usually longer than 5 characters
           text.length < 200 && // Titles are usually shorter than 200 characters
           !isPriceElement(element) && // Not a price
           !element.querySelector('img') && // Not an image container
           !text.match(/^\d+$/); // Not just numbers
  }

  // Helper function to check if an element is a product container candidate
  function isProductContainerCandidate(element) {
    // Check for product links (common patterns)
    const hasLink = element.querySelector('a[href*="/product"]') || 
                   element.querySelector('a[href*="/detail"]') ||
                   element.querySelector('a[href*="/item"]') ||
                   element.querySelector('a[href*="/p/"]');
    
    // Check for product images
    const hasImage = element.querySelector('img[src]');
    
    // Check for price information
    const hasPrice = Array.from(element.querySelectorAll('*')).some(isPriceElement);
    
    // Check for product titles
    const hasTitle = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6, span, a, div, p')).some(isTitleElement);

    // A container is likely if it has at least 3 of the 4 key features
    const features = [hasLink, hasImage, hasPrice, hasTitle];
    const featureCount = features.filter(Boolean).length;
    
    return featureCount >= 3;
  }

  // Helper function to get the topmost common parent of a set of elements
  function getTopmostCommonParent(elements) {
    if (!elements.length) return null;
    if (elements.length === 1) return elements[0];

    function getParents(element) {
      const parents = [];
      let current = element;
      while (current && current !== document.body) {
        parents.push(current);
        current = current.parentElement;
      }
      return parents;
    }

    const parentSets = elements.map(getParents);
    const commonParents = parentSets[0].filter(parent =>
      parentSets.every(set => set.includes(parent))
    );
    return commonParents[commonParents.length - 1]; // Return the topmost common parent
  }

  // Helper function to score class names (prioritize product-related terms)
  function getClassScore(className) {
    const productTerms = ['product', 'item', 'card', 'tile', 'wrapper', 'container', 'box'];
    const lowerClassName = className.toLowerCase();
    let score = 0;
    
    productTerms.forEach(term => {
      if (lowerClassName.includes(term)) score += 1;
    });
    
    return score;
  }

  // Step 1: Find all potential product containers
  const allElements = document.body.querySelectorAll('*');
  const candidates = Array.from(allElements).filter(element => {
    // Skip elements that are too high in the hierarchy
    const skipTags = ['body', 'html', 'main', 'section', 'header', 'nav', 'footer', 'aside'];
    if (skipTags.includes(element.tagName.toLowerCase())) return false;
    
    // Skip elements that are too small (likely not containers)
    const childCount = element.children.length;
    if (childCount < 2) return false;
    
    return isProductContainerCandidate(element);
  });

  console.log(`Found ${candidates.length} potential product container candidates`);

  // Step 2: Group candidates by class name to find repeated structures
  const classCount = {};
  const classScores = {};
  
  candidates.forEach(candidate => {
    const className = candidate.className || 'no-class';
    classCount[className] = (classCount[className] || 0) + 1;
    classScores[className] = getClassScore(className);
  });

  // Step 3: Filter candidates with common class names (likely product containers)
  const commonClasses = Object.keys(classCount).filter(className => 
    classCount[className] > 1 && className !== 'no-class'
  );

  // Sort by count and class score
  commonClasses.sort((a, b) => {
    const countDiff = classCount[b] - classCount[a];
    if (countDiff !== 0) return countDiff;
    return classScores[b] - classScores[a];
  });

  console.log('Common classes found:', commonClasses);
  console.log('Class counts:', classCount);

  // Step 4: Get the best matching containers
  let likelyContainers = [];
  
  if (commonClasses.length > 0) {
    const bestClass = commonClasses[0];
    likelyContainers = candidates.filter(candidate => 
      candidate.className === bestClass
    );
  } else {
    // Fallback: use all candidates if no common class found
    likelyContainers = candidates.slice(0, 5); // Limit to first 5 to avoid noise
  }

  // Step 5: Find the topmost common parent if needed
  const productContainer = likelyContainers.length > 0 ? likelyContainers[0] : null;

  // Step 6: Return the identified container's information
  if (productContainer) {
    const result = {
      tagName: productContainer.tagName,
      className: productContainer.className,
      selector: productContainer.className
        ? `.${productContainer.className.replace(/\s+/g, '.')}`
        : productContainer.tagName.toLowerCase(),
      count: classCount[productContainer.className] || 1,
      confidence: calculateConfidence(productContainer, likelyContainers.length)
    };
    
    console.log('Identified container:', result);
    return result;
  }

  console.log('No suitable product container found');
  return null;

  // Helper function to calculate confidence score
  function calculateConfidence(container, containerCount) {
    let confidence = 0;
    
    // More containers = higher confidence
    if (containerCount > 5) confidence += 0.3;
    else if (containerCount > 2) confidence += 0.2;
    else confidence += 0.1;
    
    // Product-related class names = higher confidence
    const className = container.className.toLowerCase();
    if (className.includes('product')) confidence += 0.3;
    if (className.includes('item')) confidence += 0.2;
    if (className.includes('card')) confidence += 0.2;
    
    // Has all 4 features = higher confidence
    const hasLink = container.querySelector('a[href*="/product"]') || container.querySelector('a[href*="/detail"]');
    const hasImage = container.querySelector('img[src]');
    const hasPrice = Array.from(container.querySelectorAll('*')).some(isPriceElement);
    const hasTitle = Array.from(container.querySelectorAll('*')).some(isTitleElement);
    
    const features = [hasLink, hasImage, hasPrice, hasTitle].filter(Boolean).length;
    confidence += (features / 4) * 0.3;
    
    return Math.min(confidence, 1.0); // Cap at 1.0
  }
}

// Example usage
function testProductContainer() {
  const sampleHTML = `<body class="list-page -sticky-filter" dir="ltr" style="overflow: auto;">
  <div class="analytics-data" style="display: none !important; visibility: hidden !important;">
    {
      "type": "identify",
      "data": {
        "id":"None",
        "user": {
          "email": "d41d8cd98f00b204e9800998ecf8427e",
          "signupDate": "",
          "gender": "",
          "permission": "no"
        }
      }
    }
  </div>
  <div class="analytics-data" style="display: none !important; visibility: hidden !important;">
    {
      "type": "pageViewed",
      "data": "ProductListing"
    }
  </div>
  <div class="analytics-data" style="display: none !important; visibility: hidden !important;">
    {
      "type": "gtmStart"
    }
  </div>
  <div class="pz-body-w -sticky-filter"><div class="header-wrapper js-header-wrapper -header-top-active" style="height: 90px;"><div class="js-sticky-header header-content -sticky-header">


  <div class="header__announcement-bar " style="
   --bg-color: rgba(255,255,255,100);
   --bg-sticky-color: rgba(255,255,255,100);
  "><div class="header__announcement-bar__container">
    <div class="header__announcement-bar__content">
      <pz-carousel direction="vertical" interval="8000" class="pz-carousel -direction-vertical -intersected -mounted">
      <div class="pz-carousel__container splide splide--slide splide--ttb splide--draggable is-active is-initialized" id="splide03" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ttb splide__track--draggable" id="splide03-track" style="padding-top: 0rem; padding-bottom: 0rem; height: calc(30px + 0rem);" aria-live="polite" aria-atomic="true">
          <ul class="pz-carousel__list splide__list" id="splide03-list" role="presentation" style="transform: translateY(0px);"><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide03-slide01" role="group" aria-roledescription="slide" aria-label="1 of 1" style="margin-bottom: 0rem; height: calc(100% + 0rem);"><a target="_blank" href="/kupon-firsatlari" class="header__announcement-bar__item" style="
            --text-color: ;
            --text-sticky-color: ;
            --text-position: center;
           "><span>SÜRPRİZ KUPON FIRSATLARI</span>
            </a></li></ul>
        </div>
      </div>
    </pz-carousel>
    </div> 
    </div></div><header class="header"><div class="header-band">
  <div class="header-band__item -left">
    <a href="/" class="desktop-logo">
      <img width="300" height="62" alt="Koton Siyah Logo" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo.svg" class="logo-black">
      
    </a>
  </div>

  <div class="header-band__item -mid js-header-band-mid -hidden-m">
    <form id="SearchForm" action="/list" class="header__search-form js-search-form">
      <pz-label class="fake-placeholder pz-label"><pz-input id="AutocompleteInput" class="header__search-input js-search-input pz-input -labeled" name="search_text" icon="pz-icon-search" autocomplete="off">
      <label for="pz-form-input-AutocompleteInput" class="label">
        Ara
        
      </label><input type="text" autocomplete="OFF" class="input pz-form-input" id="pz-form-input-AutocompleteInput" name="search_text">
      <i class="input-icon pz-icon-search"></i>
    </pz-input></pz-label>
      <div class="header__search-button js-header-image-search-button" hidden="">
        <i class="icon pz-icon-camera-solid"></i>
      </div>
      <div class="header__search-close-box -close-btn">
        <pz-button class="header__search-close-btn js-search-close-button -icon-button pz-button -icon-left -appearance-ghost" appearance="ghost" icon="close">
      <i class="pz-button__icon pz-icon-close"></i>
      
      
    </pz-button>
      </div>
    </form>
  </div>
  

  <div class="header-band__item -right">
    <a aria-label="Logo black" class="kotonclub-logo" href="/kotonclub-anasayfa/">
      <img alt="Logo black" class="logo-black" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/kotonclub.svg">
      
    </a>
    <div class="language-form-modal__header"><div class="language-form-modal-container js-language-form-container -reverse">
    <div class="language-form-modal-wrapper">
      <div class="js-language-button language-form-modal-button">
        <i class="pz-icon-earth"></i>
        <span class="language-form-modal-text">Türkçe</span>

        <span class="language-form-modal-text -short">TR</span>

        <i class="pz-icon-chevron-down"></i>
      </div>

      <div class="language-form-modal js-language-modal" hidden="">
        <div class="language-form-modal-close js-language-modal-close">
          <span class="-close"></span>
        </div>

        <div class="language-form-modal-title">Dil Seçimi</div>
        <div class="language-form-modal-header">
          Dil Seçenekleri
        </div><form class="js-language-form language-form active" method="POST" action="/setlang/"><input type="hidden" name="csrfmiddlewaretoken" value="P4KV9wv4Glf4KwsYaK6UFcVIgfRwLirvr2MfsFLw1xHGKKv9PXqlFngM5hfPUWmQ"><input type="hidden" name="next" value="/erkek-tisort/">
          <input type="hidden" name="language" value="tr-tr"><button type="submit" class="active">
              Türkçe
              <span><i class="pz-icon-check js-check-icon"></i></span>
            </button></form><form class="js-language-form language-form " method="POST" action="/setlang/"><input type="hidden" name="csrfmiddlewaretoken" value="P4KV9wv4Glf4KwsYaK6UFcVIgfRwLirvr2MfsFLw1xHGKKv9PXqlFngM5hfPUWmQ"><input type="hidden" name="next" value="/erkek-tisort/">
          <input type="hidden" name="language" value="en-us"><button type="submit" class="">
              English
              <span><i class="pz-icon-check js-check-icon" hidden=""></i></span>
            </button></form><pz-button class="js-language-modal-confirm language-form-modal-container-mobile-confirm pz-button -appearance-filled">
      
      
      <span class="pz-button__text">Kaydet</span>
    </pz-button>
      </div>
    </div>
</div></div>

    <ul class="action-menu">
      <li class="action-menu__item -search js-header-search-icon">
        <i class="pz-icon-search"></i>
      </li><li class="action-menu__item user-actions"><a href="/users/auth/" class="link" aria-label="Hesabım">
          <i class="icon pz-icon-user"></i>
        </a>
        <div class="user-popup">
          <div class="user-popup__content">
            <pz-button class="pz-mini-basket__view-bag-btn -w-full -link pz-button -appearance-filled -appearance-outlined -size-sm" appearance="outlined" w-full="" size="sm" link="/users/auth/">
        <a class="pz-button__link" href="/users/auth/" target="_self">
          
      
      
      <span class="pz-button__text">GİRİŞ YAP</span>
    
        </a>
      </pz-button>
            <pz-button class="pz-mini-basket__view-bag-btn -w-full -link pz-button -appearance-outlined -size-sm" appearance="outlined" w-full="" size="sm" link="/users/auth/">
        <a class="pz-button__link" href="/users/auth/" target="_self">
          
      
      
      <span class="pz-button__text">KAYIT OL</span>
    
        </a>
      </pz-button>
          </div>
        </div></li>
      <li class="action-menu__item">
        <a href="/account/favourite-products/?limit=63" class="link" aria-label="Favori Ürünler">
          <i class="icon pz-icon-heart"></i>
        </a>
      </li>

      <li class="action-menu__item card">
        <a href="/baskets/basket/" class="link" aria-label="Sepet">
          <i class="icon pz-icon-basket"></i>
          <span class="action-menu__item-badge js-pz-mini-basket-quantity" hidden="true">0</span>
        </a>

        <pz-mini-basket class="pz-mini-basket js-mini-basket -type-popup -loaded" hidden="true">
    <div class="js-pz-mini-basket-wrapper" hidden="true">
      <header class="pz-mini-basket-header">
        <h3 class="pz-mini-basket-header__title">Sepetim</h3>
        <span class="pz-mini-basket-header__count">
          <span class="js-pz-mini-basket-quantity" hidden="true">0</span> ürün
        </span>
        <pz-button class="pz-mini-basket-header__close js-mini-basket-hide-btn -icon-button pz-button -icon-left -appearance-ghost -size-xs" icon="close" size="xs" appearance="ghost">
      <i class="pz-button__icon pz-icon-close"></i>
      
      
    </pz-button>
      </header>
      <div class="pz-mini-basket-content js-mini-basket-content">
        <ul class="pz-mini-basket__list js-mini-basket-list"></ul>
        <div class="pz-mini-basket__amount">
            <div class="pz-mini-basket__amount-list">
              <span>
                Ürünlerin Toplamı (<span class=" pz-mini-basket__total-quantity js-pz-mini-basket-quantity" hidden="true">0</span>
                  ürün)
              </span>
              <span class="js-mini-basket-subtotal">0,00 TL</span>
            </div>
            <div class="js-mini-basket-discounts"></div>
        </div>
        <div class="pz-mini-basket__total">
        <span>Toplam</span>
        <span class="js-mini-basket-total">0,00 TL</span>
        </div>
        <pz-button class="pz-mini-basket__checkout-btn js-mini-basket-button -w-full -link pz-button -appearance-filled" w-full="" link="/orders/checkout/">
        <a class="pz-button__link" href="/orders/checkout/" target="_self">
          
      
      
      <span class="pz-button__text">SİPARİŞİ TAMAMLA</span>
    
        </a>
      </pz-button>
        <pz-button class="pz-mini-basket__bag-btn -w-full -link pz-button -appearance-ghost -size-sm" w-full="" size="sm" appearance="ghost" link="/baskets/basket/">
        <a class="pz-button__link" href="/baskets/basket/" target="_self">
          
      
      
      <span class="pz-button__text">sepete git</span>
    
        </a>
      </pz-button>
      </div>
    </div>
    <div class="pz-mini-basket-empty js-pz-mini-basket-empty-wrapper">
      <i class="pz-icon-cart"></i>
      <p>Sepetinizde ürün bulunmamaktadır.</p>
      <pz-button class="pz-mini-basket__actions -w-full -link pz-button -appearance-filled -size-sm" w-full="" size="sm" link="/">
        <a class="pz-button__link" href="/" target="_self">
          
      
      
      <span class="pz-button__text">Alışverişe Başla</span>
    
        </a>
      </pz-button>
    </div>
    </pz-mini-basket>
      </li>
    </ul>
  </div>
</div><button class="header__menu-toggle-button js-header-menu-toggle-btn hide-on-app" aria-label="Menüyü Aç">
        <i class="icon pz-icon-hamburger"></i>
      </button>
  
      <a href="/" class="header__logo hide-on-app" aria-label="Anasayfa">
        <img width="300" height="62" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo.svg" class="logo-black" alt="www.koton.com"></a><nav class="main-nav header__nav">
  <ul class="trunk"><li class="trunk__item js-trunk-item -hasBranch">
        <a href="/">
          <span class="-parent js-nav-menu-item" data-key="0" style="">
            Kadın
          </span>
        </a><ul class="branch">
    <li class="megamenu-container">
      <div class="left-menu js-left-menu">
        <ul><li class="left-menu__item"><a href="/kadin-tatil-valizi/" id="0" class="js-branch-toggler -active"><span style="">Tatil Valizi<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/kadin-giyim/" id="1" class="js-branch-toggler "><span style="">Giyim<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/kadin-koton-jeans/" id="2" class="js-branch-toggler "><span style="">Koton Jeans<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/sezon-trendleri" id="3" class="js-branch-toggler "><span style="">Koleksiyonlar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/kadin-abiye-davet/" id="4" class="js-branch-toggler "><span style="">Abiye &amp; Davet<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/kadin-ic-giyim/" id="5" class="js-branch-toggler "><span style="">İç Giyim ve Pijama<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/sportclub/" id="6" class="js-branch-toggler "><span style="">Spor Giyim<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/plaj-giyim-kadin/" id="7" class="js-branch-toggler "><span style="">Plaj Giyim<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/kadin-aksesuar/" id="8" class="js-branch-toggler "><span style="">Aksesuar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;sorter=newcomers" id="9" class="js-branch-toggler "><span style="--nav-item-color:#ff0000;">Fırsatlar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li></ul>
      </div>
      <div class="branch__wrapper">
        <ul><li class="branch__item js-branch-item 
                -visible" id="0"></li><li class="branch__item js-branch-item -hasTwig
                " id="1"><ul class="twig"><li class="twig__item ">
        <a href="/kadin-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-elbise/" class="twig__title js-twig-item">
          <div style="">
          <span>Elbise</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Pantolon</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-tisort/" class="twig__title js-twig-item">
          <div style="">
          <span>Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-blazer-ceket/" class="twig__title js-twig-item">
          <div style="">
          <span>Blazer Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-gomlek/" class="twig__title js-twig-item">
          <div style="">
          <span>Gömlek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-etek/" class="twig__title js-twig-item">
          <div style="">
          <span>Etek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-bluz/" class="twig__title js-twig-item">
          <div style="">
          <span>Bluz</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-yelek/" class="twig__title js-twig-item">
          <div style="">
          <span>Yelek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-atlet/" class="twig__title js-twig-item">
          <div style="">
          <span>Top/Bluz</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-sweatshirt/" class="twig__title js-twig-item">
          <div style="">
          <span>Sweatshirt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-esofman-alti/" class="twig__title js-twig-item">
          <div style="">
          <span>Eşofman Altı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-tayt/" class="twig__title js-twig-item">
          <div style="">
          <span>Tayt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-tulum/" class="twig__title js-twig-item">
          <div style="">
          <span>Tulum</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/plaj-giyim-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Plaj Giyim</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bikini-takimi-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Bikini Takım</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-mayo/" class="twig__title js-twig-item">
          <div style="">
          <span>Mayo</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-crop-ustler/" class="twig__title js-twig-item">
          <div style="">
          <span>Crop</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-abiye-davet/" class="twig__title js-twig-item">
          <div style="">
          <span>Abiye Davet</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-koton-jeans/" class="twig__title js-twig-item">
          <div style="">
          <span>Koton Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Pantolon</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-etek/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Etek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-ceket/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-trenckot/" class="twig__title js-twig-item">
          <div style="">
          <span>Trençkot</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-ceket/" class="twig__title js-twig-item">
          <div style="">
          <span>Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-deri-ceket/" class="twig__title js-twig-item">
          <div style="">
          <span>Suni Deri Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/sisme-yelek-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Şişme Yelek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/evcil-hayvan-kiyafetleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Evcil Hayvan Kıyafetleri</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="2"><ul class="twig"><li class="twig__item ">
        <a href="/jeans-kadin-fit-guide" class="twig__title js-twig-item">
          <div style="">
          <span>Fit Guide</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Pantolon</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/skinny-jean-dar-paca-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Skinny Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kargo-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Kargo Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/loose-fit-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Loose Fit Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/straight-jean-duz-paca-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Straight Fit Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/culotte-jean/" class="twig__title js-twig-item">
          <div style="">
          <span>Culotte Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/baggy-jeans/" class="twig__title js-twig-item">
          <div style="">
          <span>Baggy Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-slim-jeans/" class="twig__title js-twig-item">
          <div style="">
          <span>Slim Fit Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/mom-jeans/" class="twig__title js-twig-item">
          <div style="">
          <span>Mom Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/wide-leg-jean-bol-paca-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Wide Leg Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/flare-jean-ispanyol-paca-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Flare Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-ceket/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-etek/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Etek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-elbise/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Elbise</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-denim-yelek/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Yelek</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="3"><ul class="twig"><li class="twig__item ">
        <a href="/sezonun-cok-satanlari/?attributes_filterable_gender=Kad%C4%B1n" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satanlar</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/sezon-trendleri" class="twig__title js-twig-item">
          <div style="">
          <span>Sezonun Trendleri</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/sahika-ercumen/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Şahika Ercümen</span><span class="main-nav-badge " style="background-color: transparent; color: #fc0d1b;">Yeni!</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/melis-agazat/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Melis Agazat</span><span class="main-nav-badge " style="background-color: transparent; color: #fc0d1b;">Yeni!</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/sibil-cetinkaya/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Sibil Çetinkaya</span><span class="main-nav-badge " style="background-color: transparent; color: #fc0d1b;">Yeni!</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/sima-tarkan/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Sima Tarkan</span><span class="main-nav-badge " style="background-color: transparent; color: #fc0d1b;">Yeni!</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/inji/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>İnji</span><span class="main-nav-badge " style="background-color: transparent; color: #fc0d1b;">Yeni!</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/trend-renkler-kadin/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Trend Renkler</span><span class="main-nav-badge " style="background-color: transparent; color: #fc0d1b;">Trend!</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-keten-koleksiyonu/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Keten Koleksiyonu</span><span class="main-nav-badge " style="background-color: transparent; color: #fc0d1b;">Trend!</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/studio-kadin/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Studio Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-basic/" class="twig__title js-twig-item">
          <div style="">
          <span>Basic Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/tuvit-urunler-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüvit Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cizgili-urunler-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Çizgili Tasarımlar</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/modal-kumasli-urunler/" class="twig__title js-twig-item">
          <div style="">
          <span>Modal Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/coklu-paket-urunler-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Paketli Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-yasama-saygi-koleksiyonu/" class="twig__title js-twig-item">
          <div style="">
          <span>Yaşama Saygı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/el-emegi-yeni-sezon-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>El Emeği</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-abiye-davet/" class="twig__title js-twig-item">
          <div style="--nav-item-color:#000000;">
          <span>Abiye &amp; Davet</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bridal/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Bridal Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/plaj-giyim-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Plaj Giyim</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-ofis-stili/" class="twig__title js-twig-item">
          <div style="">
          <span>Ofis Stili</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/online-ozel-koleksiyon-urunleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Online Özel</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-lisans-koleksiyonu/" class="twig__title js-twig-item">
          <div style="">
          <span>Lisans Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kombin-onerileri/" class="twig__title js-twig-item">
          <div style="">
          <span>Kombin Önerisi</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/tenis-etegi-sortu-kiyafeti/" class="twig__title js-twig-item">
          <div style="">
          <span>Tenis Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/koton-friends/?attributes_filterable_gender=Kadın" class="twig__title js-twig-item">
          <div style="">
          <span>Koton Friends</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/ajurlu-urunler-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Ajurlu Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/brode-urunler/" class="twig__title js-twig-item">
          <div style="">
          <span>Brode Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/dogum-gunu-hediyesi-rehberi/?attributes_filterable_gender=Kadın" class="twig__title js-twig-item">
          <div style="">
          <span>Doğum Günü Hediyeleri</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/yildonumu-hediyesi/?attributes_filterable_gender=Kadın" class="twig__title js-twig-item">
          <div style="">
          <span>Yıldönümü Hediyesi</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="4"><ul class="twig"><li class="twig__item ">
        <a href="/kadin-abiye-elbise/" class="twig__title js-twig-item">
          <div style="">
          <span>Abiye Elbise</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/payetli-elbise-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Payetli Elbise</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/uzun-abiye-elbise/" class="twig__title js-twig-item">
          <div style="">
          <span>Uzun Abiye</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kisa-abiye-elbise/" class="twig__title js-twig-item">
          <div style="">
          <span>Kısa Abiye Elbise</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/beyaz-abiye-elbise/" class="twig__title js-twig-item">
          <div style="">
          <span>Beyaz Nikah Elbisesi</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/saten-elbise-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Saten Abiye</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/abiye-etek/" class="twig__title js-twig-item">
          <div style="">
          <span>Abiye Etek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/abiye-bluz/" class="twig__title js-twig-item">
          <div style="">
          <span>Abiye Bluz</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/mezuniyet-elbiseleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Mezuniyet Elbiseleri</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-aksesuar/" class="twig__title js-twig-item">
          <div style="">
          <span>Abiye Çanta &amp; Aksesuar</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="5"><ul class="twig"><li class="twig__item ">
        <a href="/kadin-ic-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/ic-giyim-pijama-yeni-gelenler/" class="twig__title js-twig-item">
          <div style="">
          <span>Yeni Gelenler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-sutyen-takimi/" class="twig__title js-twig-item">
          <div style="">
          <span>Takım Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-sutyen/" class="twig__title js-twig-item">
          <div style="">
          <span>Sütyen</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/destekli-dolgulu-sutyen/" class="twig__title js-twig-item">
          <div style="">
          <span>Ekstra Dolgulu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/push-up-sutyen/" class="twig__title js-twig-item">
          <div style="">
          <span>Dolgulu, Balenli</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/balensiz-dolgusuz-sutyen/" class="twig__title js-twig-item">
          <div style="">
          <span>Dolgusuz, Balensiz</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/balenli-dolgusuz-sutyen/" class="twig__title js-twig-item">
          <div style="">
          <span>Dolgusuz, Balenli</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/balenli-desteksiz-sutyen/" class="twig__title js-twig-item">
          <div style="">
          <span>Desteksiz, Balenli</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kulot/" class="twig__title js-twig-item">
          <div style="">
          <span>Külot</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-hipster/" class="twig__title js-twig-item">
          <div style="">
          <span>Hipster Külot</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kulot-brief/" class="twig__title js-twig-item">
          <div style="">
          <span>Brief Külot</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-brazilian/" class="twig__title js-twig-item">
          <div style="">
          <span>Brazilian Külot</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-string/" class="twig__title js-twig-item">
          <div style="">
          <span>String Külot</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/coklu-paket-kulot/" class="twig__title js-twig-item">
          <div style="">
          <span>Çoklu Paket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/basic-ic-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Basic</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-bodysuit/" class="twig__title js-twig-item">
          <div style="">
          <span>Bodysuit</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-pijama-takim/" class="twig__title js-twig-item">
          <div style="">
          <span>Pijama Takım</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-pijama-alt/" class="twig__title js-twig-item">
          <div style="">
          <span>Pijama Alt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-pijama-ust/" class="twig__title js-twig-item">
          <div style="">
          <span>Pijama Üst</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-sabahlik/" class="twig__title js-twig-item">
          <div style="">
          <span>Sabahlık</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-gecelik/" class="twig__title js-twig-item">
          <div style="">
          <span>Gecelik</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/ev-rahat-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Ev Giyim</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bridal/" class="twig__title js-twig-item">
          <div style="">
          <span>Bridal</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="6"><ul class="twig"><li class="twig__item ">
        <a href="/kadin-spor-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-spor-yeni-gelenler/" class="twig__title js-twig-item">
          <div style="">
          <span>Yeni Gelenler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-sporcu-sutyeni/" class="twig__title js-twig-item">
          <div style="">
          <span>Sporcu Sütyeni</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-spor-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-spor-tisort/" class="twig__title js-twig-item">
          <div style="">
          <span>Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-spor-tayt/" class="twig__title js-twig-item">
          <div style="">
          <span>Tayt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-spor-atlet/" class="twig__title js-twig-item">
          <div style="">
          <span>Atlet</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-spor-sweatshirt/" class="twig__title js-twig-item">
          <div style="">
          <span>Sweatshirt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-spor-esofman-alti/" class="twig__title js-twig-item">
          <div style="">
          <span>Eşofman Altı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/yoga-koleksiyonu/" class="twig__title js-twig-item">
          <div style="">
          <span>Yoga</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/tum-gun-aktif-spor/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Gün Aktif</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/sport-core-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Sport Core</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/basic-spor-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Basic</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/tenis-etegi-sortu-kiyafeti/" class="twig__title js-twig-item">
          <div style="">
          <span>Tenis</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-spor-dis-giyim/?page_size=60" class="twig__title js-twig-item">
          <div style="">
          <span>Dış Giyim</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-spor-outdoor/" class="twig__title js-twig-item">
          <div style="">
          <span>Outdoor</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-spor-kosu/" class="twig__title js-twig-item">
          <div style="">
          <span>Koşu</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="7"><ul class="twig"><li class="twig__item ">
        <a href="/plaj-giyim-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-bikini-alt/" class="twig__title js-twig-item">
          <div style="">
          <span>Bikini Alt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-bikini-ust/" class="twig__title js-twig-item">
          <div style="">
          <span>Bikini Üst</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bikini-takimi-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Bikini Takım</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-mayo/" class="twig__title js-twig-item">
          <div style="">
          <span>Mayo</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-plaj-elbisesi-pareo/" class="twig__title js-twig-item">
          <div style="">
          <span>Plaj Giyim</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/plaj-aksesuarlari/" class="twig__title js-twig-item">
          <div style="">
          <span>Plaj Aksesuarları</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/hasir-urunler/" class="twig__title js-twig-item">
          <div style="">
          <span>Hasır Ürünler</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="8"><ul class="twig"><li class="twig__item ">
        <a href="/kadin-aksesuar/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-canta/" class="twig__title js-twig-item">
          <div style="">
          <span>Çanta</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-parfum/" class="twig__title js-twig-item">
          <div style="">
          <span>Parfüm</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-sapka/" class="twig__title js-twig-item">
          <div style="">
          <span>Şapka</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/hasir-sapka-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Hasır Şapka</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-sal/" class="twig__title js-twig-item">
          <div style="">
          <span>Şal</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kemer/" class="twig__title js-twig-item">
          <div style="">
          <span>Kemer</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-taki/" class="twig__title js-twig-item">
          <div style="">
          <span>Takı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kolye/?page_size=60" class="twig__title js-twig-item">
          <div style="">
          <span>Kolye</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kupe/" class="twig__title js-twig-item">
          <div style="">
          <span>Küpe</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bileklik-bilezik/?page_size=60" class="twig__title js-twig-item">
          <div style="">
          <span>Bileklik</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-yuzuk/" class="twig__title js-twig-item">
          <div style="">
          <span>Yüzük</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-corap/" class="twig__title js-twig-item">
          <div style="">
          <span>Çorap</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-sac-aksesuarlari/" class="twig__title js-twig-item">
          <div style="">
          <span>Saç Aksesuarları</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="9"><ul class="twig"><li class="twig__item ">
        <a href="/kampanyali-urunler-25-35/?attributes_filterable_gender=Kadın&amp;attributes_filterable_category=Elbise" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Elbiseler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kampanyali-urunler-25-35/?attributes_filterable_gender=Kadın&amp;attributes_filterable_category=Bluz" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Bluzlar</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kampanyali-urunler-25-35/?attributes_filterable_gender=Kadın&amp;attributes_filterable_category=Pantolon" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Pantolonlar</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;attributes_filterable_category=%C5%9Eort&amp;sorter=newcomers" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Şortlar</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;sorter=newcomers&amp;attributes_filterable_category=Ti%C5%9F%C3%B6rt" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Tişörtler</span></div>
        </a>
      </li></ul></li></ul>
      </div>
      <div class="right-menu">
        <ul><li class="right-menu__item"><a href="/kadin-tatil-valizi/" class=" "><pz-image-placeholder class="pz-image-placeholder block">
                <img class="js-nav-image 0" data-src="https://ktnimg2.mncdn.com/cms/2025/05/27/2753714f-fb0d-4414-81cc-7ab96cc192ee.jpg" data-width="150" data-height="80" alt="Tatil Valizi" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=">
              </pz-image-placeholder></a></li></ul>
      </div>
    </li>
  </ul></li><li class="trunk__item js-trunk-item -hasBranch">
        <a href="/ole-anasayfa">
          <span class="-parent js-nav-menu-item" data-key="1" style="">
            Genç
          </span>
        </a><ul class="branch">
    <li class="megamenu-container">
      <div class="left-menu js-left-menu">
        <ul><li class="left-menu__item"><a href="/genc-kadin-giyim/" id="0" class="js-branch-toggler -active"><span style="">Tatil Valizi<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/inji/" id="1" class="js-branch-toggler "><span style="">Koton x İnji<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/genc-kadin-keten-koleksiyonu/" id="2" class="js-branch-toggler "><span style="">Keten Koleksiyonu<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/genc-kadin-giyim/" id="3" class="js-branch-toggler "><span style="">Giyim<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/coklu-paket-urunler-kadin/" id="4" class="js-branch-toggler "><span style="">Paketli Ürünler<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/kadin-koton-jeans/" id="5" class="js-branch-toggler "><span style="">Koton Jeans<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/sezon-trendleri/" id="6" class="js-branch-toggler "><span style="">Sezonun Trendleri<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;sorter=newcomers" id="7" class="js-branch-toggler "><span style="--nav-item-color:#ff0000;">Fırsatlar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li></ul>
      </div>
      <div class="branch__wrapper">
        <ul><li class="branch__item js-branch-item 
                -visible" id="0"></li><li class="branch__item js-branch-item 
                " id="1"></li><li class="branch__item js-branch-item 
                " id="2"></li><li class="branch__item js-branch-item -hasTwig
                " id="3"><ul class="twig"><li class="twig__item ">
        <a href="/genc-kadin-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-yeni-gelenler/" class="twig__title js-twig-item">
          <div style="">
          <span>Yeni Gelenler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-elbise/" class="twig__title js-twig-item">
          <div style="">
          <span>Elbise</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Pantolon</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-tisort/" class="twig__title js-twig-item">
          <div style="">
          <span>Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-etek/" class="twig__title js-twig-item">
          <div style="">
          <span>Etek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-bluz/" class="twig__title js-twig-item">
          <div style="">
          <span>Bluz</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-atlet/" class="twig__title js-twig-item">
          <div style="">
          <span>Top/Bluz</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-tulum/" class="twig__title js-twig-item">
          <div style="">
          <span>Tulum</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-crop-ustler/" class="twig__title js-twig-item">
          <div style="">
          <span>Crop</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-gomlek/" class="twig__title js-twig-item">
          <div style="">
          <span>Gömlek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-hirka/" class="twig__title js-twig-item">
          <div style="">
          <span>Hırka</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-esofman-alti/" class="twig__title js-twig-item">
          <div style="">
          <span>Eşofman Altı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-tayt/" class="twig__title js-twig-item">
          <div style="">
          <span>Tayt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/genc-kadin-sweatshirt/" class="twig__title js-twig-item">
          <div style="">
          <span>Sweatshirt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-deri-ceket/" class="twig__title js-twig-item">
          <div style="">
          <span>Suni Deri Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-koton-jeans/" class="twig__title js-twig-item">
          <div style="">
          <span>Koton Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Pantolon</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-ceket/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-etek/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Etek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-denim-yelek/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Yelek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/sezonun-trendleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Sezonun Trendleri</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item 
                " id="4"></li><li class="branch__item js-branch-item -hasTwig
                " id="5"><ul class="twig"><li class="twig__item ">
        <a href="/kadin-kot-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Pantolon</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/skinny-jean-dar-paca-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Skinny Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kargo-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Kargo Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/loose-fit-kadin/" class="twig__title js-twig-item">
          <div style="">
          <span>Loose Fit Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/straight-jean-duz-paca-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Straight Fit Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/culotte-jean/" class="twig__title js-twig-item">
          <div style="">
          <span>Culotte Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/baggy-jeans/" class="twig__title js-twig-item">
          <div style="">
          <span>Baggy Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-slim-jeans/" class="twig__title js-twig-item">
          <div style="">
          <span>Slim Fit Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/mom-jeans/" class="twig__title js-twig-item">
          <div style="">
          <span>Mom Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/wide-leg-jean-bol-paca-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Wide Leg Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/flare-jean-ispanyol-paca-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Flare Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-ceket/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-etek/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Etek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-kot-elbise/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Elbise</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kadin-denim-yelek/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Yelek</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item 
                " id="6"></li><li class="branch__item js-branch-item -hasTwig
                " id="7"><ul class="twig"><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;attributes_filterable_category=Elbise" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Elbiseler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;attributes_filterable_category=Bluz" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Bluzlar</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;attributes_filterable_category=Pantolon" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Pantolonlar</span></div>
        </a>
      </li></ul></li></ul>
      </div>
      <div class="right-menu">
        <ul><li class="right-menu__item"><a href="/genc-kadin-giyim/" class=" "><pz-image-placeholder class="pz-image-placeholder block">
                <img class="js-nav-image 0" data-src="https://ktnimg2.mncdn.com/cms/2025/05/27/3d077c99-cf16-44df-92a5-82affa83477f.jpg" data-width="150" data-height="80" alt="Tatil Valizi" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=">
              </pz-image-placeholder></a></li></ul>
      </div>
    </li>
  </ul></li><li class="trunk__item js-trunk-item -hasBranch">
        <a href="/erkek-anasayfa">
          <span class="-parent js-nav-menu-item -clicked" data-key="2" style="">
            Erkek
          </span>
        </a><ul class="branch">
    <li class="megamenu-container">
      <div class="left-menu js-left-menu">
        <ul><li class="left-menu__item"><a href="/erkek-tatil-valizi/" id="0" class="js-branch-toggler -active"><span style="">Tatil Valizi<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/erkek-yeni-sezon/?sorter=newcomers" id="1" class="js-branch-toggler "><span style="">Yeni Gelenler<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/erkek-giyim/" id="2" class="js-branch-toggler "><span style="">Giyim<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/erkek-koton-jeans/" id="3" class="js-branch-toggler "><span style="">Koton Jeans<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/erkek-anasayfa" id="4" class="js-branch-toggler "><span style="">Koleksiyonlar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/erkek-pijama-ev-ve-ic-giyim/" id="5" class="js-branch-toggler "><span style="">İç Giyim &amp; Ev Giyim<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/erkek-spor-giyim/" id="6" class="js-branch-toggler "><span style="">Spor Giyim<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/erkek-deniz-sortu/" id="7" class="js-branch-toggler "><span style="">Plaj Giyim<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/erkek-aksesuar/" id="8" class="js-branch-toggler "><span style="">Aksesuar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek&amp;sorter=newcomers" id="9" class="js-branch-toggler "><span style="--nav-item-color:#ff0000;">Fırsatlar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li></ul>
      </div>
      <div class="branch__wrapper">
        <ul><li class="branch__item js-branch-item 
                -visible" id="0"></li><li class="branch__item js-branch-item 
                " id="1"></li><li class="branch__item js-branch-item -hasTwig
                " id="2"><ul class="twig"><li class="twig__item ">
        <a href="/erkek-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-tisort/" class="twig__title js-twig-item">
          <div style="">
          <span>Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-sort-bermuda/" class="twig__title js-twig-item">
          <div style="">
          <span>Şort &amp; Bermuda</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-kot-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-polo-tisort/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Polo Tişört</span><span class="main-nav-badge " style="background-color: transparent; color: #fc0d1b;">Trend!</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-gomlek/" class="twig__title js-twig-item">
          <div style="">
          <span>Gömlek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Pantolon</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-kisa-kollu-gomlek/" class="twig__title js-twig-item">
          <div style="">
          <span>Kısa Kollu Gömlek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-keten-gomlek/" class="twig__title js-twig-item">
          <div style="">
          <span>Keten Gömlek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-keten-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Keten Pantolon</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-keten-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Keten Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/triko-tisort-erkek/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Triko Tişört</span><span class="main-nav-badge " style="background-color: transparent; color: #fc0d1b;">Trend!</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-baskili-tisort/" class="twig__title js-twig-item">
          <div style="">
          <span>Baskılı Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-kot-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Koton Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-atlet/" class="twig__title js-twig-item">
          <div style="">
          <span>Atlet &amp; Kolsuz Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-deniz-sortu/" class="twig__title js-twig-item">
          <div style="">
          <span>Deniz Şortu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-sort-takim/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Şort Takım</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-basics/" class="twig__title js-twig-item">
          <div style="">
          <span>Basics</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-kot-ceket/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-blazer-ceket/" class="twig__title js-twig-item">
          <div style="">
          <span>Blazer Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-sweatshirt/" class="twig__title js-twig-item">
          <div style="">
          <span>Sweatshirt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-esofman-alti/" class="twig__title js-twig-item">
          <div style="">
          <span>Eşofman Altı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-siyah-jean/" class="twig__title js-twig-item">
          <div style="">
          <span>Black Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-mevsimlik-mont/" class="twig__title js-twig-item">
          <div style="">
          <span>Mevsimlik Mont &amp; Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-boxer/" class="twig__title js-twig-item">
          <div style="">
          <span>Boxer</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-yelek/" class="twig__title js-twig-item">
          <div style="">
          <span>Yelek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/buyuk-beden-giyim/?attributes_filterable_gender=Erkek&amp;sorter=newcomers" class="twig__title js-twig-item">
          <div style="">
          <span>Büyük Beden</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-hirka/" class="twig__title js-twig-item">
          <div style="">
          <span>Hırka &amp; Fermuarlı Sweatshirt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-dis-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Dış Giyim</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/evcil-hayvan-kiyafetleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Evcil Hayvan Kıyafetleri</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="3"><ul class="twig"><li class="twig__item ">
        <a href="/erkek-koton-jeans/?attributes_filterable_category=Kot%20%C5%9Eort" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-koton-jeans/?attributes_filterable_category=Kot%20Ceket" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-siyah-jean/" class="twig__title js-twig-item">
          <div style="">
          <span>Black Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/jeans-erkek-fit-guide" class="twig__title js-twig-item">
          <div style="">
          <span>Fit Guide</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-jean-slim/" class="twig__title js-twig-item">
          <div style="">
          <span>Slim Fit Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-jean-skinny/" class="twig__title js-twig-item">
          <div style="">
          <span>Skinny Fit Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-jean-straight/" class="twig__title js-twig-item">
          <div style="">
          <span>Straight Fit Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-jean-loose/" class="twig__title js-twig-item">
          <div style="">
          <span>Loose Fit Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-jean-tapered/" class="twig__title js-twig-item">
          <div style="">
          <span>Tapered Fit Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-jean-super-skinny/" class="twig__title js-twig-item">
          <div style="">
          <span>Super Skinny Fit Jeans</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="4"><ul class="twig"><li class="twig__item ">
        <a href="/erkek-yasama-saygi-koleksiyonu/" class="twig__title js-twig-item">
          <div style="">
          <span>Yaşama Saygı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/sezonun-cok-satanlari/?attributes_filterable_gender=Erkek" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satanlar</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-keten-koleksiyonu/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Keten Koleksiyonu</span><span class="main-nav-badge " style="background-color: transparent; color: #fc0d1b;">Trend!</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-tatil-valizi/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Tatil Valizi</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/festival-kiyafetleri-erkek/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Festival Kombinleri</span><span class="main-nav-badge " style="background-color: transparent; color: #fc0d1b;">Yeni!</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cizgili-gomlek-pantolon-tisort/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Çizgili Tasarımlar</span><span class="main-nav-badge " style="background-color: transparent; color: #fc0d1b;">Trend!</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-basics/" class="twig__title js-twig-item">
          <div style="--nav-item-color:#000000;">
          <span>Basic Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-oversized-modasi/" class="twig__title js-twig-item">
          <div style="">
          <span>Oversize Modası</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-marin-tonlari/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Marine Esintisi</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-plaj-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Plaj Giyim</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/utility-erkek/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Utility</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/polished-prep-erkek/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Polished Prep</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-ofis-stili/" class="twig__title js-twig-item">
          <div style="">
          <span>Ofis Stili</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/takim-elbise/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Takım Elbise</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-kampuse-donus/" class="twig__title js-twig-item">
          <div style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Trend Kombinler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-lisans-koleksiyonu/" class="twig__title js-twig-item">
          <div style="">
          <span>Lisans Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/coklu-paket-urunler-erkek/" class="twig__title js-twig-item">
          <div style="">
          <span>Paketli Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/tarz-ikili/" class="twig__title js-twig-item">
          <div style="">
          <span>Tarz İkili</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-kolej-koleksiyonu/?sorter=newcomers" class="twig__title js-twig-item">
          <div style="--nav-item-color:#000000;--nav-item-font-style:normal;--nav-item-font-weight:400;">
          <span>Kolej Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/back-in-black/" class="twig__title js-twig-item">
          <div style="">
          <span>Back in Black</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/dogum-gunu-hediyesi-rehberi/?attributes_filterable_gender=Erkek" class="twig__title js-twig-item">
          <div style="">
          <span>Doğum Günü Hediyeleri</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/yildonumu-hediyesi/?attributes_filterable_gender=Erkek" class="twig__title js-twig-item">
          <div style="">
          <span>Yıldönümü Hediyesi</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="5"><ul class="twig"><li class="twig__item ">
        <a href="/erkek-pijama-ev-ve-ic-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-boxer/" class="twig__title js-twig-item">
          <div style="">
          <span>Boxer</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-corap/?sorter=price" class="twig__title js-twig-item">
          <div style="">
          <span>Çorap</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-atlet/?sorter=price" class="twig__title js-twig-item">
          <div style="">
          <span>Atlet</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-esofman-alti/" class="twig__title js-twig-item">
          <div style="">
          <span>Eşofman Altı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-oversize-tisort/?sorter=price" class="twig__title js-twig-item">
          <div style="">
          <span>Oversize Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-basic-tisort/?sorter=price" class="twig__title js-twig-item">
          <div style="">
          <span>Basic Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-baskili-tisort/?sorter=price" class="twig__title js-twig-item">
          <div style="">
          <span>Baskılı Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-orme-sort/?sorter=price" class="twig__title js-twig-item">
          <div style="">
          <span>Örme Şort</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="6"><ul class="twig"><li class="twig__item ">
        <a href="/erkek-spor-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-spor-tisort/" class="twig__title js-twig-item">
          <div style="">
          <span>Spor Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-spor-atlet/" class="twig__title js-twig-item">
          <div style="">
          <span>Spor Atlet</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-spor-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Spor Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-spor-sweatshirt/" class="twig__title js-twig-item">
          <div style="">
          <span>Spor Sweatshirt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-spor-esofman-alti/" class="twig__title js-twig-item">
          <div style="">
          <span>Spor Eşofman Altı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-spor-dis-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Spor Dış Giyim</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-spor-outdoor/" class="twig__title js-twig-item">
          <div style="">
          <span>Outdoor</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="7"><ul class="twig"><li class="twig__item ">
        <a href="/erkek-keten-koleksiyonu/" class="twig__title js-twig-item">
          <div style="">
          <span>Keten</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-deniz-sortu/" class="twig__title js-twig-item">
          <div style="">
          <span>Deniz Şortu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-sort-bermuda/" class="twig__title js-twig-item">
          <div style="">
          <span>Şort &amp; Bermuda</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-gomlek/" class="twig__title js-twig-item">
          <div style="">
          <span>Gömlek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-desenli-gomlek/" class="twig__title js-twig-item">
          <div style="">
          <span>Desenli Gömlek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-tisort/" class="twig__title js-twig-item">
          <div style="">
          <span>Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-atlet/" class="twig__title js-twig-item">
          <div style="">
          <span>Atlet &amp; Kolsuz Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-aksesuar/" class="twig__title js-twig-item">
          <div style="">
          <span>Aksesuar</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="8"><ul class="twig"><li class="twig__item ">
        <a href="/erkek-aksesuar/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-sapka/" class="twig__title js-twig-item">
          <div style="">
          <span>Şapka</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-parfum/" class="twig__title js-twig-item">
          <div style="">
          <span>Parfüm</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="9"><ul class="twig"><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek&amp;attributes_filterable_category=Kot%20%C5%9Eort&amp;attributes_filterable_category=Spor%20%C5%9Eort&amp;attributes_filterable_category=%C5%9Eort%20%26%20Bermuda" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Şortlar</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek&amp;attributes_filterable_category=Ti%C5%9F%C3%B6rt&amp;attributes_filterable_category=Spor%20Ti%C5%9F%C3%B6rt" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Tişörtler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek&amp;attributes_filterable_category=G%C3%B6mlek" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Gömlekler</span></div>
        </a>
      </li></ul></li></ul>
      </div>
      <div class="right-menu">
        <ul><li class="right-menu__item"><a href="/erkek-keten-koleksiyonu/" class=" "><pz-image-placeholder class="pz-image-placeholder block">
                <img class="js-nav-image 0" data-src="https://ktnimg2.mncdn.com/cms/2025/06/11/879fd3a0-3ce1-4564-9c72-b71bd7670447.jpg" data-width="150" data-height="80" alt="Keten Koleksiyonu" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=">
              </pz-image-placeholder></a></li></ul>
      </div>
    </li>
  </ul></li><li class="trunk__item js-trunk-item -hasBranch">
        <a href="/cocuk-anasayfa">
          <span class="-parent js-nav-menu-item" data-key="3" style="">
            Çocuk
          </span>
        </a><ul class="branch">
    <li class="megamenu-container">
      <div class="left-menu js-left-menu">
        <ul><li class="left-menu__item"><a href="/cocuk-yazlik-urunler/" id="0" class="js-branch-toggler -active"><span style="">Tatil Valizi<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/cocuk-yeni-sezon/?sorter=newcomers" id="1" class="js-branch-toggler "><span style="">Yeni Gelenler<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/sezonun-cok-satanlari/?attributes_filterable_gender=K%C4%B1z%20%C3%87ocuk&amp;attributes_filterable_gender=Erkek%20%C3%87ocuk" id="2" class="js-branch-toggler "><span style="">Çok Satanlar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/cocuk-kiz-cocuk/" id="3" class="js-branch-toggler "><span style="">Kız Çocuk (5-14 Yaş)<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/cocuk-erkek-cocuk/" id="4" class="js-branch-toggler "><span style="">Erkek Çocuk (5-14 Yaş)<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/cocuk-lisans-koleksiyonu/" id="5" class="js-branch-toggler "><span style="">Lisans Koleksiyonu<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/cocuk-giyim/" id="6" class="js-branch-toggler "><span style="">Koleksiyonlar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/cocuk/" id="7" class="js-branch-toggler "><span style="--nav-item-color:#000000;">Yaşa Göre Satın Al<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/cocuk-aksesuar-modelleri/" id="8" class="js-branch-toggler "><span style="">Aksesuar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek%20Bebek&amp;attributes_filterable_gender=K%C4%B1z%20Bebek&amp;sorter=newcomers" id="9" class="js-branch-toggler "><span style="--nav-item-color:#ff0000;">Fırsatlar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li></ul>
      </div>
      <div class="branch__wrapper">
        <ul><li class="branch__item js-branch-item 
                -visible" id="0"></li><li class="branch__item js-branch-item 
                " id="1"></li><li class="branch__item js-branch-item 
                " id="2"></li><li class="branch__item js-branch-item -hasTwig
                " id="3"><ul class="twig"><li class="twig__item ">
        <a href="/cocuk-kiz-cocuk/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-elbise-tulum/" class="twig__title js-twig-item">
          <div style="">
          <span>Elbise &amp; Tulum</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-tisort/" class="twig__title js-twig-item">
          <div style="">
          <span>Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-atlet/" class="twig__title js-twig-item">
          <div style="">
          <span>Atlet</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-kot-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-set/" class="twig__title js-twig-item">
          <div style="">
          <span>Çoklu Paket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Pantolon</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-tayt/" class="twig__title js-twig-item">
          <div style="">
          <span>Tayt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-kot-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-etek/" class="twig__title js-twig-item">
          <div style="">
          <span>Etek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-bluz/" class="twig__title js-twig-item">
          <div style="">
          <span>Bluz</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-gomlek/" class="twig__title js-twig-item">
          <div style="">
          <span>Gömlek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-sort-etek/" class="twig__title js-twig-item">
          <div style="">
          <span>Şort Etek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-kot-ceket/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-tulum-salopet-modelleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Tulum &amp; Salopet</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-bikini-mayo/" class="twig__title js-twig-item">
          <div style="">
          <span>Bikini &amp; Mayo</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-sweatshirt/" class="twig__title js-twig-item">
          <div style="">
          <span>Sweatshirt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-esofman-alti/" class="twig__title js-twig-item">
          <div style="">
          <span>Eşofman Altı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-dis-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Mevsimlik Mont&amp;Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-yelek/" class="twig__title js-twig-item">
          <div style="">
          <span>Yelek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-hirka/" class="twig__title js-twig-item">
          <div style="">
          <span>Hırka</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-aksesuar/" class="twig__title js-twig-item">
          <div style="">
          <span>Aksesuar</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-sapka/" class="twig__title js-twig-item">
          <div style="">
          <span>Şapka</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-corap/" class="twig__title js-twig-item">
          <div style="">
          <span>Çorap</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="4"><ul class="twig"><li class="twig__item ">
        <a href="/cocuk-erkek-cocuk/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-tisort/" class="twig__title js-twig-item">
          <div style="">
          <span>Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Pantolon</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-kot-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Kot Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-kot-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-gomlek/" class="twig__title js-twig-item">
          <div style="">
          <span>Gömlek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-atlet/" class="twig__title js-twig-item">
          <div style="">
          <span>Atlet</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-polo-yaka-tisort/?attributes_filterable_gender=Erkek%20%C3%87ocuk" class="twig__title js-twig-item">
          <div style="">
          <span>Polo Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-sweatshirt/" class="twig__title js-twig-item">
          <div style="">
          <span>Sweatshirt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-esofman-alti/" class="twig__title js-twig-item">
          <div style="">
          <span>Eşofman Altı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-dis-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Mevsimlik Mont&amp;Ceket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-set/" class="twig__title js-twig-item">
          <div style="">
          <span>Çoklu Paket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-deniz-sortu/" class="twig__title js-twig-item">
          <div style="">
          <span>Deniz Şortu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-boxer/" class="twig__title js-twig-item">
          <div style="">
          <span>Boxer</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-aksesuar/" class="twig__title js-twig-item">
          <div style="">
          <span>Aksesuar</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-sapka/" class="twig__title js-twig-item">
          <div style="">
          <span>Şapka</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-corap/" class="twig__title js-twig-item">
          <div style="">
          <span>Çorap</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item 
                " id="5"></li><li class="branch__item js-branch-item -hasTwig
                " id="6"><ul class="twig"><li class="twig__item ">
        <a href="/cocuk-yasama-saygi-koleksiyonu/" class="twig__title js-twig-item">
          <div style="">
          <span>Yaşama Saygı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk-yazlik-urunler/" class="twig__title js-twig-item">
          <div style="">
          <span>Tatil Valizi</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk-alt-ust-takim/" class="twig__title js-twig-item">
          <div style="">
          <span>Alt Üst Takım</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/anne-kiz-uyumu/" class="twig__title js-twig-item">
          <div style="">
          <span>Anne Kız Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk-lisans-koleksiyonu/" class="twig__title js-twig-item">
          <div style="">
          <span>Lisans Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk-keten-pantolon-gomlek-sort-etek/" class="twig__title js-twig-item">
          <div style="">
          <span>Keten Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk-basic-urunler/" class="twig__title js-twig-item">
          <div style="">
          <span>Basic Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk-ataturk-koleksiyonu/" class="twig__title js-twig-item">
          <div style="">
          <span>Atatürk Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk-hediye-onerileri/" class="twig__title js-twig-item">
          <div style="">
          <span>Hediye Önerileri</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/koton-friends/?attributes_filterable_gender=K%C4%B1z%20%C3%87ocuk&amp;attributes_filterable_gender=Erkek%20%C3%87ocuk" class="twig__title js-twig-item">
          <div style="">
          <span>Koton Friends</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk-pijama-takimlari/" class="twig__title js-twig-item">
          <div style="">
          <span>Pijama Takımları</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk-plaj-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Plaj Giyim</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="7"><ul class="twig"><li class="twig__item ">
        <a href="/cocuk/?attributes_integration_beden=4%2F5%20Ya%C5%9F" class="twig__title js-twig-item">
          <div style="">
          <span>4-5 Yaş | 110 cm</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk/?attributes_integration_beden=5%2F6%20Ya%C5%9F" class="twig__title js-twig-item">
          <div style="">
          <span>5-6 Yaş | 116 cm</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk/?attributes_integration_beden=6%2F7%20Ya%C5%9F" class="twig__title js-twig-item">
          <div style="">
          <span>6-7 Yaş | 122 cm</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk/?attributes_integration_beden=7%2F8%20Ya%C5%9F" class="twig__title js-twig-item">
          <div style="">
          <span>7-8 Yaş | 128 cm</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk/?attributes_integration_beden=9%2F10%20Ya%C5%9F" class="twig__title js-twig-item">
          <div style="">
          <span>9-10 Yaş | 140 cm</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk/?attributes_integration_beden=9%2F10%20Ya%C5%9F" class="twig__title js-twig-item">
          <div style="">
          <span>11-12 Yaş | 152 cm</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk/?attributes_integration_beden=13%2F14%20Ya%C5%9F" class="twig__title js-twig-item">
          <div style="">
          <span>13-14 Yaş | 164 cm</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="8"><ul class="twig"><li class="twig__item ">
        <a href="/cocuk-aksesuar-modelleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk-sapka-modelleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Şapka</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk-corap-modelleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Çorap</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/cocuk-canta-modelleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Çanta</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-cocuk-sac-aksesuarlari/" class="twig__title js-twig-item">
          <div style="">
          <span>Saç Aksesuarları</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="9"><ul class="twig"><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=K%C4%B1z%20%C3%87ocuk&amp;attributes_filterable_gender=Erkek%20%C3%87ocuk&amp;attributes_filterable_category=%C5%9Eort" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=K%C4%B1z%20%C3%87ocuk&amp;attributes_filterable_gender=Erkek%20%C3%87ocuk&amp;attributes_filterable_category=Elbise%20%26%20Tulum" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Elbiseler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=K%C4%B1z%20%C3%87ocuk&amp;attributes_filterable_gender=Erkek%20%C3%87ocuk&amp;attributes_filterable_category=Ti%C5%9F%C3%B6rt" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Tişörtler</span></div>
        </a>
      </li></ul></li></ul>
      </div>
      <div class="right-menu">
        <ul><li class="right-menu__item"><a href="/cocuk-yazlik-urunler/" class=" "><pz-image-placeholder class="pz-image-placeholder block">
                <img class="js-nav-image 0" data-src="https://ktnimg2.mncdn.com/cms/2025/05/27/bab4034f-4fa2-48d7-b338-6c0b5b7f05a8.jpg" data-width="150" data-height="80" alt="Tatil Valizi" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=">
              </pz-image-placeholder></a></li></ul>
      </div>
    </li>
  </ul></li><li class="trunk__item js-trunk-item -hasBranch">
        <a href="/bebek-anasayfa">
          <span class="-parent js-nav-menu-item" data-key="4" style="">
            Bebek
          </span>
        </a><ul class="branch">
    <li class="megamenu-container">
      <div class="left-menu js-left-menu">
        <ul><li class="left-menu__item"><a href="/bebek-yazlik-urunler/" id="0" class="js-branch-toggler -active"><span style="">Tatil Valizi<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/bebek-yeni-sezon/?sorter=newcomers" id="1" class="js-branch-toggler "><span style="">Yeni Gelenler<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/sezonun-cok-satanlari/?attributes_filterable_gender=Erkek%20Bebek&amp;attributes_filterable_gender=K%C4%B1z%20Bebek" id="2" class="js-branch-toggler "><span style="">Çok Satanlar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/bebek-kiz-bebek/" id="3" class="js-branch-toggler "><span style="">Kız Bebek (0-5 Yaş)<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/bebek-erkek-bebek/" id="4" class="js-branch-toggler "><span style="">Erkek Bebek (0-5 Yaş)<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/bebek-lisans-koleksiyonu/" id="5" class="js-branch-toggler "><span style="">Lisans Koleksiyonu<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/bebek-giyim/" id="6" class="js-branch-toggler "><span style="">Koleksiyonlar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/bebek/" id="7" class="js-branch-toggler "><span style="--nav-item-color:#000000;">Yaşa Göre Satın Al<i class="pz-icon-chevron-right icon"></i>
              </span></a></li><li class="left-menu__item"><a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek%20Bebek&amp;attributes_filterable_gender=K%C4%B1z%20Bebek&amp;sorter=newcomers" id="8" class="js-branch-toggler "><span style="--nav-item-color:#ff0000;">Fırsatlar<i class="pz-icon-chevron-right icon"></i>
              </span></a></li></ul>
      </div>
      <div class="branch__wrapper">
        <ul><li class="branch__item js-branch-item 
                -visible" id="0"></li><li class="branch__item js-branch-item 
                " id="1"></li><li class="branch__item js-branch-item 
                " id="2"></li><li class="branch__item js-branch-item -hasTwig
                " id="3"><ul class="twig"><li class="twig__item ">
        <a href="/bebek-kiz-bebek/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-elbise-tulum/" class="twig__title js-twig-item">
          <div style="">
          <span>Elbise &amp; Tulum</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-tisort/" class="twig__title js-twig-item">
          <div style="">
          <span>Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-set/" class="twig__title js-twig-item">
          <div style="">
          <span>Çoklu Paket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-atlet/" class="twig__title js-twig-item">
          <div style="">
          <span>Atlet</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-tayt/" class="twig__title js-twig-item">
          <div style="">
          <span>Tayt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-gomlek-bluz/" class="twig__title js-twig-item">
          <div style="">
          <span>Gömlek &amp; Bluz</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-pantolon-kot-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Pantolon &amp; Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-etek/" class="twig__title js-twig-item">
          <div style="">
          <span>Etek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-tulum-salopet-modelleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Tulum &amp; Salopet</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-sweatshirt/" class="twig__title js-twig-item">
          <div style="">
          <span>Sweatshirt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-esofman-alti/" class="twig__title js-twig-item">
          <div style="">
          <span>Eşofman Altı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-dis-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Dış Giyim</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-yenidogan-modelleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Yenidoğan</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/kiz-bebek-bikini-mayo/" class="twig__title js-twig-item">
          <div style="">
          <span>Bikini&amp;Mayo</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="4"><ul class="twig"><li class="twig__item ">
        <a href="/bebek-erkek-bebek/" class="twig__title js-twig-item">
          <div style="">
          <span>Tüm Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-bebek-tisort/" class="twig__title js-twig-item">
          <div style="">
          <span>Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-bebek-sort/" class="twig__title js-twig-item">
          <div style="">
          <span>Şort</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-bebek-gomlek/" class="twig__title js-twig-item">
          <div style="">
          <span>Gömlek</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-bebek-pantolon-kot-pantolon/" class="twig__title js-twig-item">
          <div style="">
          <span>Pantolon &amp; Jeans</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-bebek-set/" class="twig__title js-twig-item">
          <div style="">
          <span>Çoklu Paket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-bebek-atlet/" class="twig__title js-twig-item">
          <div style="">
          <span>Atlet</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-cocuk-polo-yaka-tisort/?attributes_filterable_gender=Erkek%20Bebek" class="twig__title js-twig-item">
          <div style="">
          <span>Polo Tişört</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-bebek-sweatshirt/" class="twig__title js-twig-item">
          <div style="">
          <span>Sweatshirt</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-bebek-esofman-alti/" class="twig__title js-twig-item">
          <div style="">
          <span>Eşofman Altı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-bebek-tulum/" class="twig__title js-twig-item">
          <div style="">
          <span>Tulum</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-bebek-dis-giyim/" class="twig__title js-twig-item">
          <div style="">
          <span>Dış Giyim</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-bebek-yenidogan-modelleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Yenidoğan</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/erkek-bebek-deniz-sortu/" class="twig__title js-twig-item">
          <div style="">
          <span>Mayo &amp; Deniz Şortu</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item 
                " id="5"></li><li class="branch__item js-branch-item -hasTwig
                " id="6"><ul class="twig"><li class="twig__item ">
        <a href="/bebek-yasama-saygi-koleksiyonu/" class="twig__title js-twig-item">
          <div style="">
          <span>Yaşama Saygı</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek-yazlik-urunler/" class="twig__title js-twig-item">
          <div style="">
          <span>Tatil Valizi</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek-pamuklu-urunler/" class="twig__title js-twig-item">
          <div style="">
          <span>%100 Pamuklu Ürünler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek-alt-ust-takim/" class="twig__title js-twig-item">
          <div style="">
          <span>Alt Üst Takım</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek-coklu-paket/" class="twig__title js-twig-item">
          <div style="">
          <span>Çoklu Paket</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek-basic-urunler/" class="twig__title js-twig-item">
          <div style="">
          <span>Basic Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek-lisans-koleksiyonu/" class="twig__title js-twig-item">
          <div style="">
          <span>Lisans Koleksiyonu</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek-renkli-giyim-modelleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Favori Renkler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek-hayvanlar-alemi/" class="twig__title js-twig-item">
          <div style="">
          <span>Hayvanlar Alemi</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek-hediye-onerileri/" class="twig__title js-twig-item">
          <div style="">
          <span>Hediye Önerileri</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/yenidogan-modelleri/" class="twig__title js-twig-item">
          <div style="">
          <span>Yenidoğan</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="7"><ul class="twig"><li class="twig__item ">
        <a href="/bebek/?attributes_integration_beden=9%2F12%20Ay" class="twig__title js-twig-item">
          <div style="">
          <span>9-12 Ay | 80 cm</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek/?attributes_integration_beden=12%2F18%20Ay" class="twig__title js-twig-item">
          <div style="">
          <span>12-18 Ay | 86 cm</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek/?attributes_integration_beden=18%2F24%20Ay" class="twig__title js-twig-item">
          <div style="">
          <span>18-24 Ay | 92 cm</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek/?attributes_integration_beden=24%2F36%20Ay" class="twig__title js-twig-item">
          <div style="">
          <span>24-36 Ay | 98 cm</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek/?attributes_integration_beden=3%2F4%20Ya%C5%9F" class="twig__title js-twig-item">
          <div style="">
          <span>3-4 Yaş | 104 cm</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/bebek/?attributes_integration_beden=4%2F5%20Ya%C5%9F" class="twig__title js-twig-item">
          <div style="">
          <span>4-5 Yaş  | 110 cm</span></div>
        </a>
      </li></ul></li><li class="branch__item js-branch-item -hasTwig
                " id="8"><ul class="twig"><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=K%C4%B1z%20Bebek&amp;attributes_filterable_category=Elbise%20%26%20Tulum" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Elbiseler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek%20Bebek&amp;attributes_filterable_gender=K%C4%B1z%20Bebek&amp;attributes_filterable_category=Ti%C5%9F%C3%B6rt" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Tişörtler</span></div>
        </a>
      </li><li class="twig__item ">
        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek%20Bebek&amp;attributes_filterable_gender=K%C4%B1z%20Bebek&amp;attributes_filterable_category=%C5%9Eort" class="twig__title js-twig-item">
          <div style="">
          <span>Çok Satan Şort</span></div>
        </a>
      </li></ul></li></ul>
      </div>
      <div class="right-menu">
        <ul><li class="right-menu__item"><a href="/bebek-yazlik-urunler/" class=" "><pz-image-placeholder class="pz-image-placeholder block">
                <img class="js-nav-image 0" data-src="https://ktnimg2.mncdn.com/cms/2025/05/27/5c18a51e-45a5-4f11-9443-e4a48c003a4e.jpg" data-width="150" data-height="80" alt="Tatil Valizi" src="https://ktnimg2.mncdn.com/cms/2025/05/27/5c18a51e-45a5-4f11-9443-e4a48c003a4e.jpg">
              </pz-image-placeholder></a></li></ul>
      </div>
    </li>
  </ul></li><li class="trunk__item js-trunk-item -hasBranch">
        <a href="/indirim-anasayfa">
          <span class="-parent js-nav-menu-item" data-key="5" style="">
            Fırsatlar
          </span>
        </a><ul class="branch">
    <li class="megamenu-container">
      <div class="left-menu js-left-menu">
        <ul><li class="left-menu__item"><a href="/kampanyali-urunler-net50/" id="0" class="js-branch-toggler -active"><span style="">Net %50 İndirim<i class="pz-icon-chevron-right icon"></i>
              </span></a></li></ul>
      </div>
      <div class="branch__wrapper">
        <ul><li class="branch__item js-branch-item 
                -visible" id="0"></li></ul>
      </div>
      <div class="right-menu">
        <ul><li class="right-menu__item"><a href="/15-30-40-indirimleri/" class=" "><pz-image-placeholder class="pz-image-placeholder block">
                <img class="js-nav-image 0" data-src="https://ktnimg2.mncdn.com/cms/2025/07/01/f3ae9162-3094-4dbd-ad9e-4e403920cc75.jpg" data-width="150" data-height="80" alt="" src="https://ktnimg2.mncdn.com/cms/2025/07/01/f3ae9162-3094-4dbd-ad9e-4e403920cc75.jpg">
              </pz-image-placeholder></a></li></ul>
      </div>
    </li>
  </ul></li><li class="trunk__item js-trunk-item ">
        <a href="/yasama-saygi-manifestosu">
          <span class="-parent js-nav-menu-item" data-key="6" style="">
            Sürdürülebilirlik
          </span>
        </a></li></ul>
</nav><div class="mobile-nav-overlay js-mobile-nav-overlay"></div>
<div class="mobile-nav js-mobile-nav">
  <header class="mobile-nav__header">
    <a aria-label="Koton Siyah Logo" href="/" class="logo hide-on-app">
      <img loading="lazy" width="300" height="62" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo.svg" alt="Koton Siyah Logo" class="logo">
    </a>
    <button class="mobile-nav__close js-mobile-nav-close" aria-label="Menüyü Kapat">
      <i class="pz-icon-close"></i>
    </button>
  </header>

  <div class="mobile-nav__body">
    <ul class="mobile-nav__list"><li class="mobile-nav__list-item js-mobile-nav-item -active">
            <a href="/" class="link js-tab-link" style="">
              Kadın
            </a><div class="mobile-nav__menu js-mobile-nav-menu -visible">
                <div class="mobile-nav__menu-list-w">
                  <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/kadin-tatil-valizi/" class="link child-link js-child-link " style=""><span>Tatil Valizi</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/kadin-giyim/" class="link child-link js-child-link -haschild" style=""><span>Giyim</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Giyim</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-elbise/" class="link -grandchild" style="">
                                      <span>
                                      Elbise</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Pantolon</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-tisort/" class="link -grandchild" style="">
                                      <span>
                                      Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-blazer-ceket/" class="link -grandchild" style="">
                                      <span>
                                      Blazer Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-gomlek/" class="link -grandchild" style="">
                                      <span>
                                      Gömlek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-etek/" class="link -grandchild" style="">
                                      <span>
                                      Etek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-bluz/" class="link -grandchild" style="">
                                      <span>
                                      Bluz</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-sort/" class="link -grandchild" style="">
                                      <span>
                                      Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-yelek/" class="link -grandchild" style="">
                                      <span>
                                      Yelek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-atlet/" class="link -grandchild" style="">
                                      <span>
                                      Top/Bluz</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-sweatshirt/" class="link -grandchild" style="">
                                      <span>
                                      Sweatshirt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-esofman-alti/" class="link -grandchild" style="">
                                      <span>
                                      Eşofman Altı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-tayt/" class="link -grandchild" style="">
                                      <span>
                                      Tayt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-tulum/" class="link -grandchild" style="">
                                      <span>
                                      Tulum</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/plaj-giyim-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Plaj Giyim</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bikini-takimi-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Bikini Takım</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-mayo/" class="link -grandchild" style="">
                                      <span>
                                      Mayo</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-crop-ustler/" class="link -grandchild" style="">
                                      <span>
                                      Crop</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-abiye-davet/" class="link -grandchild" style="">
                                      <span>
                                      Abiye Davet</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-koton-jeans/" class="link -grandchild" style="">
                                      <span>
                                      Koton Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Kot Pantolon</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-etek/" class="link -grandchild" style="">
                                      <span>
                                      Kot Etek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-sort/" class="link -grandchild" style="">
                                      <span>
                                      Kot Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-ceket/" class="link -grandchild" style="">
                                      <span>
                                      Kot Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-trenckot/" class="link -grandchild" style="">
                                      <span>
                                      Trençkot</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-ceket/" class="link -grandchild" style="">
                                      <span>
                                      Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-deri-ceket/" class="link -grandchild" style="">
                                      <span>
                                      Suni Deri Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/sisme-yelek-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Şişme Yelek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/evcil-hayvan-kiyafetleri/" class="link -grandchild" style="">
                                      <span>
                                      Evcil Hayvan Kıyafetleri</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/kadin-koton-jeans/" class="link child-link js-child-link -haschild" style=""><span>Koton Jeans</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Koton Jeans</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/jeans-kadin-fit-guide" class="link -grandchild" style="">
                                      <span>
                                      Fit Guide</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Kot Pantolon</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/skinny-jean-dar-paca-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Skinny Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kargo-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Kargo Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/loose-fit-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Loose Fit Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/straight-jean-duz-paca-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Straight Fit Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/culotte-jean/" class="link -grandchild" style="">
                                      <span>
                                      Culotte Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/baggy-jeans/" class="link -grandchild" style="">
                                      <span>
                                      Baggy Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-slim-jeans/" class="link -grandchild" style="">
                                      <span>
                                      Slim Fit Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/mom-jeans/" class="link -grandchild" style="">
                                      <span>
                                      Mom Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/wide-leg-jean-bol-paca-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Wide Leg Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/flare-jean-ispanyol-paca-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Flare Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-ceket/" class="link -grandchild" style="">
                                      <span>
                                      Kot Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-sort/" class="link -grandchild" style="">
                                      <span>
                                      Kot Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-etek/" class="link -grandchild" style="">
                                      <span>
                                      Kot Etek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-elbise/" class="link -grandchild" style="">
                                      <span>
                                      Kot Elbise</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-denim-yelek/" class="link -grandchild" style="">
                                      <span>
                                      Kot Yelek</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/sezon-trendleri" class="link child-link js-child-link -haschild" style=""><span>Koleksiyonlar</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Koleksiyonlar</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/sezonun-cok-satanlari/?attributes_filterable_gender=Kad%C4%B1n" class="link -grandchild" style="">
                                      <span>
                                      Çok Satanlar</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/sezon-trendleri" class="link -grandchild" style="">
                                      <span>
                                      Sezonun Trendleri</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/sahika-ercumen/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Şahika Ercümen<span class="mobile-nav-badge " style="background-color: transparent; color: #fc0d1b;">Yeni!</span></span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/melis-agazat/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Melis Agazat<span class="mobile-nav-badge " style="background-color: transparent; color: #fc0d1b;">Yeni!</span></span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/sibil-cetinkaya/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Sibil Çetinkaya<span class="mobile-nav-badge " style="background-color: transparent; color: #fc0d1b;">Yeni!</span></span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/sima-tarkan/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Sima Tarkan<span class="mobile-nav-badge " style="background-color: transparent; color: #fc0d1b;">Yeni!</span></span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/inji/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      İnji<span class="mobile-nav-badge " style="background-color: transparent; color: #fc0d1b;">Yeni!</span></span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/trend-renkler-kadin/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Trend Renkler<span class="mobile-nav-badge " style="background-color: transparent; color: #fc0d1b;">Trend!</span></span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-keten-koleksiyonu/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Keten Koleksiyonu<span class="mobile-nav-badge " style="background-color: transparent; color: #fc0d1b;">Trend!</span></span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/studio-kadin/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Studio Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-basic/" class="link -grandchild" style="">
                                      <span>
                                      Basic Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/tuvit-urunler-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Tüvit Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cizgili-urunler-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Çizgili Tasarımlar</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/modal-kumasli-urunler/" class="link -grandchild" style="">
                                      <span>
                                      Modal Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/coklu-paket-urunler-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Paketli Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-yasama-saygi-koleksiyonu/" class="link -grandchild" style="">
                                      <span>
                                      Yaşama Saygı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/el-emegi-yeni-sezon-kadin/" class="link -grandchild" style="">
                                      <span>
                                      El Emeği</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-abiye-davet/" class="link -grandchild" style="--nav-item-color:#000000;">
                                      <span>
                                      Abiye &amp; Davet</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bridal/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Bridal Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/plaj-giyim-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Plaj Giyim</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-ofis-stili/" class="link -grandchild" style="">
                                      <span>
                                      Ofis Stili</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/online-ozel-koleksiyon-urunleri/" class="link -grandchild" style="">
                                      <span>
                                      Online Özel</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-lisans-koleksiyonu/" class="link -grandchild" style="">
                                      <span>
                                      Lisans Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kombin-onerileri/" class="link -grandchild" style="">
                                      <span>
                                      Kombin Önerisi</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/tenis-etegi-sortu-kiyafeti/" class="link -grandchild" style="">
                                      <span>
                                      Tenis Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/koton-friends/?attributes_filterable_gender=Kadın" class="link -grandchild" style="">
                                      <span>
                                      Koton Friends</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/ajurlu-urunler-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Ajurlu Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/brode-urunler/" class="link -grandchild" style="">
                                      <span>
                                      Brode Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/dogum-gunu-hediyesi-rehberi/?attributes_filterable_gender=Kadın" class="link -grandchild" style="">
                                      <span>
                                      Doğum Günü Hediyeleri</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/yildonumu-hediyesi/?attributes_filterable_gender=Kadın" class="link -grandchild" style="">
                                      <span>
                                      Yıldönümü Hediyesi</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/kadin-abiye-davet/" class="link child-link js-child-link -haschild" style=""><span>Abiye &amp; Davet</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Abiye &amp; Davet</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-abiye-elbise/" class="link -grandchild" style="">
                                      <span>
                                      Abiye Elbise</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/payetli-elbise-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Payetli Elbise</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/uzun-abiye-elbise/" class="link -grandchild" style="">
                                      <span>
                                      Uzun Abiye</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kisa-abiye-elbise/" class="link -grandchild" style="">
                                      <span>
                                      Kısa Abiye Elbise</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/beyaz-abiye-elbise/" class="link -grandchild" style="">
                                      <span>
                                      Beyaz Nikah Elbisesi</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/saten-elbise-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Saten Abiye</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/abiye-etek/" class="link -grandchild" style="">
                                      <span>
                                      Abiye Etek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/abiye-bluz/" class="link -grandchild" style="">
                                      <span>
                                      Abiye Bluz</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/mezuniyet-elbiseleri/" class="link -grandchild" style="">
                                      <span>
                                      Mezuniyet Elbiseleri</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-aksesuar/" class="link -grandchild" style="">
                                      <span>
                                      Abiye Çanta &amp; Aksesuar</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/kadin-ic-giyim/" class="link child-link js-child-link -haschild" style=""><span>İç Giyim ve Pijama</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">İç Giyim ve Pijama</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-ic-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/ic-giyim-pijama-yeni-gelenler/" class="link -grandchild" style="">
                                      <span>
                                      Yeni Gelenler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-sutyen-takimi/" class="link -grandchild" style="">
                                      <span>
                                      Takım Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-sutyen/" class="link -grandchild" style="">
                                      <span>
                                      Sütyen</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/destekli-dolgulu-sutyen/" class="link -grandchild" style="">
                                      <span>
                                      Ekstra Dolgulu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/push-up-sutyen/" class="link -grandchild" style="">
                                      <span>
                                      Dolgulu, Balenli</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/balensiz-dolgusuz-sutyen/" class="link -grandchild" style="">
                                      <span>
                                      Dolgusuz, Balensiz</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/balenli-dolgusuz-sutyen/" class="link -grandchild" style="">
                                      <span>
                                      Dolgusuz, Balenli</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/balenli-desteksiz-sutyen/" class="link -grandchild" style="">
                                      <span>
                                      Desteksiz, Balenli</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kulot/" class="link -grandchild" style="">
                                      <span>
                                      Külot</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-hipster/" class="link -grandchild" style="">
                                      <span>
                                      Hipster Külot</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kulot-brief/" class="link -grandchild" style="">
                                      <span>
                                      Brief Külot</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-brazilian/" class="link -grandchild" style="">
                                      <span>
                                      Brazilian Külot</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-string/" class="link -grandchild" style="">
                                      <span>
                                      String Külot</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/coklu-paket-kulot/" class="link -grandchild" style="">
                                      <span>
                                      Çoklu Paket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/basic-ic-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Basic</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-bodysuit/" class="link -grandchild" style="">
                                      <span>
                                      Bodysuit</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-pijama-takim/" class="link -grandchild" style="">
                                      <span>
                                      Pijama Takım</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-pijama-alt/" class="link -grandchild" style="">
                                      <span>
                                      Pijama Alt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-pijama-ust/" class="link -grandchild" style="">
                                      <span>
                                      Pijama Üst</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-sabahlik/" class="link -grandchild" style="">
                                      <span>
                                      Sabahlık</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-gecelik/" class="link -grandchild" style="">
                                      <span>
                                      Gecelik</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/ev-rahat-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Ev Giyim</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bridal/" class="link -grandchild" style="">
                                      <span>
                                      Bridal</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/sportclub/" class="link child-link js-child-link -haschild" style=""><span>Spor Giyim</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Spor Giyim</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-spor-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-spor-yeni-gelenler/" class="link -grandchild" style="">
                                      <span>
                                      Yeni Gelenler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-sporcu-sutyeni/" class="link -grandchild" style="">
                                      <span>
                                      Sporcu Sütyeni</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-spor-sort/" class="link -grandchild" style="">
                                      <span>
                                      Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-spor-tisort/" class="link -grandchild" style="">
                                      <span>
                                      Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-spor-tayt/" class="link -grandchild" style="">
                                      <span>
                                      Tayt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-spor-atlet/" class="link -grandchild" style="">
                                      <span>
                                      Atlet</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-spor-sweatshirt/" class="link -grandchild" style="">
                                      <span>
                                      Sweatshirt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-spor-esofman-alti/" class="link -grandchild" style="">
                                      <span>
                                      Eşofman Altı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/yoga-koleksiyonu/" class="link -grandchild" style="">
                                      <span>
                                      Yoga</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/tum-gun-aktif-spor/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Gün Aktif</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/sport-core-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Sport Core</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/basic-spor-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Basic</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/tenis-etegi-sortu-kiyafeti/" class="link -grandchild" style="">
                                      <span>
                                      Tenis</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-spor-dis-giyim/?page_size=60" class="link -grandchild" style="">
                                      <span>
                                      Dış Giyim</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-spor-outdoor/" class="link -grandchild" style="">
                                      <span>
                                      Outdoor</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-spor-kosu/" class="link -grandchild" style="">
                                      <span>
                                      Koşu</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/plaj-giyim-kadin/" class="link child-link js-child-link -haschild" style=""><span>Plaj Giyim</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Plaj Giyim</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/plaj-giyim-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-bikini-alt/" class="link -grandchild" style="">
                                      <span>
                                      Bikini Alt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-bikini-ust/" class="link -grandchild" style="">
                                      <span>
                                      Bikini Üst</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bikini-takimi-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Bikini Takım</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-mayo/" class="link -grandchild" style="">
                                      <span>
                                      Mayo</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-plaj-elbisesi-pareo/" class="link -grandchild" style="">
                                      <span>
                                      Plaj Giyim</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/plaj-aksesuarlari/" class="link -grandchild" style="">
                                      <span>
                                      Plaj Aksesuarları</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/hasir-urunler/" class="link -grandchild" style="">
                                      <span>
                                      Hasır Ürünler</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/kadin-aksesuar/" class="link child-link js-child-link -haschild" style=""><span>Aksesuar</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Aksesuar</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-aksesuar/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-canta/" class="link -grandchild" style="">
                                      <span>
                                      Çanta</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-parfum/" class="link -grandchild" style="">
                                      <span>
                                      Parfüm</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-sapka/" class="link -grandchild" style="">
                                      <span>
                                      Şapka</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/hasir-sapka-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Hasır Şapka</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-sal/" class="link -grandchild" style="">
                                      <span>
                                      Şal</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kemer/" class="link -grandchild" style="">
                                      <span>
                                      Kemer</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-taki/" class="link -grandchild" style="">
                                      <span>
                                      Takı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kolye/?page_size=60" class="link -grandchild" style="">
                                      <span>
                                      Kolye</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kupe/" class="link -grandchild" style="">
                                      <span>
                                      Küpe</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bileklik-bilezik/?page_size=60" class="link -grandchild" style="">
                                      <span>
                                      Bileklik</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-yuzuk/" class="link -grandchild" style="">
                                      <span>
                                      Yüzük</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-corap/" class="link -grandchild" style="">
                                      <span>
                                      Çorap</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-sac-aksesuarlari/" class="link -grandchild" style="">
                                      <span>
                                      Saç Aksesuarları</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;sorter=newcomers" class="link child-link js-child-link -haschild" style="--nav-item-color:#ff0000;"><span>Fırsatlar</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Fırsatlar</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kampanyali-urunler-25-35/?attributes_filterable_gender=Kadın&amp;attributes_filterable_category=Elbise" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Elbiseler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kampanyali-urunler-25-35/?attributes_filterable_gender=Kadın&amp;attributes_filterable_category=Bluz" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Bluzlar</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kampanyali-urunler-25-35/?attributes_filterable_gender=Kadın&amp;attributes_filterable_category=Pantolon" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Pantolonlar</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;attributes_filterable_category=%C5%9Eort&amp;sorter=newcomers" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Şortlar</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;sorter=newcomers&amp;attributes_filterable_category=Ti%C5%9F%C3%B6rt" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Tişörtler</span>
                                    </a></li></ul>
                            </div>
                          </div></li></ul>
                </div>
              </div></li><li class="mobile-nav__list-item js-mobile-nav-item ">
            <a href="/ole-anasayfa" class="link js-tab-link" style="">
              Genç
            </a><div class="mobile-nav__menu js-mobile-nav-menu ">
                <div class="mobile-nav__menu-list-w">
                  <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/genc-kadin-giyim/" class="link child-link js-child-link " style=""><span>Tatil Valizi</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/inji/" class="link child-link js-child-link " style=""><span>Koton x İnji</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/genc-kadin-keten-koleksiyonu/" class="link child-link js-child-link " style=""><span>Keten Koleksiyonu</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/genc-kadin-giyim/" class="link child-link js-child-link -haschild" style=""><span>Giyim</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Giyim</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-yeni-gelenler/" class="link -grandchild" style="">
                                      <span>
                                      Yeni Gelenler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-elbise/" class="link -grandchild" style="">
                                      <span>
                                      Elbise</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Pantolon</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-tisort/" class="link -grandchild" style="">
                                      <span>
                                      Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-etek/" class="link -grandchild" style="">
                                      <span>
                                      Etek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-bluz/" class="link -grandchild" style="">
                                      <span>
                                      Bluz</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-sort/" class="link -grandchild" style="">
                                      <span>
                                      Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-atlet/" class="link -grandchild" style="">
                                      <span>
                                      Top/Bluz</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-tulum/" class="link -grandchild" style="">
                                      <span>
                                      Tulum</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-crop-ustler/" class="link -grandchild" style="">
                                      <span>
                                      Crop</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-gomlek/" class="link -grandchild" style="">
                                      <span>
                                      Gömlek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-hirka/" class="link -grandchild" style="">
                                      <span>
                                      Hırka</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-esofman-alti/" class="link -grandchild" style="">
                                      <span>
                                      Eşofman Altı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-tayt/" class="link -grandchild" style="">
                                      <span>
                                      Tayt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/genc-kadin-sweatshirt/" class="link -grandchild" style="">
                                      <span>
                                      Sweatshirt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-deri-ceket/" class="link -grandchild" style="">
                                      <span>
                                      Suni Deri Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-koton-jeans/" class="link -grandchild" style="">
                                      <span>
                                      Koton Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Kot Pantolon</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-ceket/" class="link -grandchild" style="">
                                      <span>
                                      Kot Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-sort/" class="link -grandchild" style="">
                                      <span>
                                      Kot Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-etek/" class="link -grandchild" style="">
                                      <span>
                                      Kot Etek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-denim-yelek/" class="link -grandchild" style="">
                                      <span>
                                      Kot Yelek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/sezonun-trendleri/" class="link -grandchild" style="">
                                      <span>
                                      Sezonun Trendleri</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/coklu-paket-urunler-kadin/" class="link child-link js-child-link " style=""><span>Paketli Ürünler</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/kadin-koton-jeans/" class="link child-link js-child-link -haschild" style=""><span>Koton Jeans</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Koton Jeans</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Kot Pantolon</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/skinny-jean-dar-paca-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Skinny Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kargo-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Kargo Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/loose-fit-kadin/" class="link -grandchild" style="">
                                      <span>
                                      Loose Fit Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/straight-jean-duz-paca-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Straight Fit Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/culotte-jean/" class="link -grandchild" style="">
                                      <span>
                                      Culotte Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/baggy-jeans/" class="link -grandchild" style="">
                                      <span>
                                      Baggy Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-slim-jeans/" class="link -grandchild" style="">
                                      <span>
                                      Slim Fit Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/mom-jeans/" class="link -grandchild" style="">
                                      <span>
                                      Mom Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/wide-leg-jean-bol-paca-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Wide Leg Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/flare-jean-ispanyol-paca-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Flare Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-ceket/" class="link -grandchild" style="">
                                      <span>
                                      Kot Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-sort/" class="link -grandchild" style="">
                                      <span>
                                      Kot Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-etek/" class="link -grandchild" style="">
                                      <span>
                                      Kot Etek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-kot-elbise/" class="link -grandchild" style="">
                                      <span>
                                      Kot Elbise</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kadin-denim-yelek/" class="link -grandchild" style="">
                                      <span>
                                      Kot Yelek</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/sezon-trendleri/" class="link child-link js-child-link " style=""><span>Sezonun Trendleri</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;sorter=newcomers" class="link child-link js-child-link -haschild" style="--nav-item-color:#ff0000;"><span>Fırsatlar</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Fırsatlar</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;attributes_filterable_category=Elbise" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Elbiseler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;attributes_filterable_category=Bluz" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Bluzlar</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Kad%C4%B1n&amp;attributes_filterable_category=Pantolon" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Pantolonlar</span>
                                    </a></li></ul>
                            </div>
                          </div></li></ul>
                </div>
              </div></li><li class="mobile-nav__list-item js-mobile-nav-item ">
            <a href="/erkek-anasayfa" class="link js-tab-link" style="">
              Erkek
            </a><div class="mobile-nav__menu js-mobile-nav-menu ">
                <div class="mobile-nav__menu-list-w">
                  <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/erkek-anasayfa" class="link child-link js-child-link " style=""><span>Erkek Anasayfa</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/erkek-tatil-valizi/" class="link child-link js-child-link " style=""><span>Tatil Valizi</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/erkek-yeni-sezon/?sorter=newcomers" class="link child-link js-child-link " style=""><span>Yeni Gelenler</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/erkek-giyim/" class="link child-link js-child-link -haschild" style=""><span>Giyim</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Giyim</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-tisort/" class="link -grandchild" style="">
                                      <span>
                                      Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-sort-bermuda/" class="link -grandchild" style="">
                                      <span>
                                      Şort &amp; Bermuda</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-kot-sort/" class="link -grandchild" style="">
                                      <span>
                                      Kot Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-polo-tisort/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Polo Tişört<span class="mobile-nav-badge " style="background-color: transparent; color: #fc0d1b;">Trend!</span></span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-gomlek/" class="link -grandchild" style="">
                                      <span>
                                      Gömlek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Pantolon</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-kisa-kollu-gomlek/" class="link -grandchild" style="">
                                      <span>
                                      Kısa Kollu Gömlek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-keten-gomlek/" class="link -grandchild" style="">
                                      <span>
                                      Keten Gömlek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-keten-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Keten Pantolon</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-keten-sort/" class="link -grandchild" style="">
                                      <span>
                                      Keten Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/triko-tisort-erkek/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Triko Tişört<span class="mobile-nav-badge " style="background-color: transparent; color: #fc0d1b;">Trend!</span></span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-baskili-tisort/" class="link -grandchild" style="">
                                      <span>
                                      Baskılı Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-kot-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Koton Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-atlet/" class="link -grandchild" style="">
                                      <span>
                                      Atlet &amp; Kolsuz Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-deniz-sortu/" class="link -grandchild" style="">
                                      <span>
                                      Deniz Şortu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-sort-takim/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Şort Takım</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-basics/" class="link -grandchild" style="">
                                      <span>
                                      Basics</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-kot-ceket/" class="link -grandchild" style="">
                                      <span>
                                      Kot Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-blazer-ceket/" class="link -grandchild" style="">
                                      <span>
                                      Blazer Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-sweatshirt/" class="link -grandchild" style="">
                                      <span>
                                      Sweatshirt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-esofman-alti/" class="link -grandchild" style="">
                                      <span>
                                      Eşofman Altı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-siyah-jean/" class="link -grandchild" style="">
                                      <span>
                                      Black Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-mevsimlik-mont/" class="link -grandchild" style="">
                                      <span>
                                      Mevsimlik Mont &amp; Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-boxer/" class="link -grandchild" style="">
                                      <span>
                                      Boxer</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-yelek/" class="link -grandchild" style="">
                                      <span>
                                      Yelek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/buyuk-beden-giyim/?attributes_filterable_gender=Erkek&amp;sorter=newcomers" class="link -grandchild" style="">
                                      <span>
                                      Büyük Beden</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-hirka/" class="link -grandchild" style="">
                                      <span>
                                      Hırka &amp; Fermuarlı Sweatshirt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-dis-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Dış Giyim</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/evcil-hayvan-kiyafetleri/" class="link -grandchild" style="">
                                      <span>
                                      Evcil Hayvan Kıyafetleri</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/erkek-koton-jeans/" class="link child-link js-child-link -haschild" style=""><span>Koton Jeans</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Koton Jeans</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-koton-jeans/?attributes_filterable_category=Kot%20%C5%9Eort" class="link -grandchild" style="">
                                      <span>
                                      Kot Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-koton-jeans/?attributes_filterable_category=Kot%20Ceket" class="link -grandchild" style="">
                                      <span>
                                      Kot Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-siyah-jean/" class="link -grandchild" style="">
                                      <span>
                                      Black Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/jeans-erkek-fit-guide" class="link -grandchild" style="">
                                      <span>
                                      Fit Guide</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-jean-slim/" class="link -grandchild" style="">
                                      <span>
                                      Slim Fit Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-jean-skinny/" class="link -grandchild" style="">
                                      <span>
                                      Skinny Fit Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-jean-straight/" class="link -grandchild" style="">
                                      <span>
                                      Straight Fit Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-jean-loose/" class="link -grandchild" style="">
                                      <span>
                                      Loose Fit Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-jean-tapered/" class="link -grandchild" style="">
                                      <span>
                                      Tapered Fit Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-jean-super-skinny/" class="link -grandchild" style="">
                                      <span>
                                      Super Skinny Fit Jeans</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/erkek-anasayfa" class="link child-link js-child-link -haschild" style=""><span>Koleksiyonlar</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Koleksiyonlar</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-yasama-saygi-koleksiyonu/" class="link -grandchild" style="">
                                      <span>
                                      Yaşama Saygı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/sezonun-cok-satanlari/?attributes_filterable_gender=Erkek" class="link -grandchild" style="">
                                      <span>
                                      Çok Satanlar</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-keten-koleksiyonu/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Keten Koleksiyonu<span class="mobile-nav-badge " style="background-color: transparent; color: #fc0d1b;">Trend!</span></span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-tatil-valizi/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Tatil Valizi</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/festival-kiyafetleri-erkek/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Festival Kombinleri<span class="mobile-nav-badge " style="background-color: transparent; color: #fc0d1b;">Yeni!</span></span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cizgili-gomlek-pantolon-tisort/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Çizgili Tasarımlar<span class="mobile-nav-badge " style="background-color: transparent; color: #fc0d1b;">Trend!</span></span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-basics/" class="link -grandchild" style="--nav-item-color:#000000;">
                                      <span>
                                      Basic Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-oversized-modasi/" class="link -grandchild" style="">
                                      <span>
                                      Oversize Modası</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-marin-tonlari/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Marine Esintisi</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-plaj-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Plaj Giyim</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/utility-erkek/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Utility</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/polished-prep-erkek/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Polished Prep</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-ofis-stili/" class="link -grandchild" style="">
                                      <span>
                                      Ofis Stili</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/takim-elbise/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Takım Elbise</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-kampuse-donus/" class="link -grandchild" style="--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Trend Kombinler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-lisans-koleksiyonu/" class="link -grandchild" style="">
                                      <span>
                                      Lisans Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/coklu-paket-urunler-erkek/" class="link -grandchild" style="">
                                      <span>
                                      Paketli Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/tarz-ikili/" class="link -grandchild" style="">
                                      <span>
                                      Tarz İkili</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-kolej-koleksiyonu/?sorter=newcomers" class="link -grandchild" style="--nav-item-color:#000000;--nav-item-font-style:normal;--nav-item-font-weight:400;">
                                      <span>
                                      Kolej Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/back-in-black/" class="link -grandchild" style="">
                                      <span>
                                      Back in Black</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/dogum-gunu-hediyesi-rehberi/?attributes_filterable_gender=Erkek" class="link -grandchild" style="">
                                      <span>
                                      Doğum Günü Hediyeleri</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/yildonumu-hediyesi/?attributes_filterable_gender=Erkek" class="link -grandchild" style="">
                                      <span>
                                      Yıldönümü Hediyesi</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/erkek-pijama-ev-ve-ic-giyim/" class="link child-link js-child-link -haschild" style=""><span>İç Giyim &amp; Ev Giyim</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">İç Giyim &amp; Ev Giyim</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-pijama-ev-ve-ic-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-boxer/" class="link -grandchild" style="">
                                      <span>
                                      Boxer</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-corap/?sorter=price" class="link -grandchild" style="">
                                      <span>
                                      Çorap</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-atlet/?sorter=price" class="link -grandchild" style="">
                                      <span>
                                      Atlet</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-esofman-alti/" class="link -grandchild" style="">
                                      <span>
                                      Eşofman Altı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-oversize-tisort/?sorter=price" class="link -grandchild" style="">
                                      <span>
                                      Oversize Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-basic-tisort/?sorter=price" class="link -grandchild" style="">
                                      <span>
                                      Basic Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-baskili-tisort/?sorter=price" class="link -grandchild" style="">
                                      <span>
                                      Baskılı Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-orme-sort/?sorter=price" class="link -grandchild" style="">
                                      <span>
                                      Örme Şort</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/erkek-spor-giyim/" class="link child-link js-child-link -haschild" style=""><span>Spor Giyim</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Spor Giyim</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-spor-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-spor-tisort/" class="link -grandchild" style="">
                                      <span>
                                      Spor Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-spor-atlet/" class="link -grandchild" style="">
                                      <span>
                                      Spor Atlet</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-spor-sort/" class="link -grandchild" style="">
                                      <span>
                                      Spor Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-spor-sweatshirt/" class="link -grandchild" style="">
                                      <span>
                                      Spor Sweatshirt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-spor-esofman-alti/" class="link -grandchild" style="">
                                      <span>
                                      Spor Eşofman Altı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-spor-dis-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Spor Dış Giyim</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-spor-outdoor/" class="link -grandchild" style="">
                                      <span>
                                      Outdoor</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/erkek-deniz-sortu/" class="link child-link js-child-link -haschild" style=""><span>Plaj Giyim</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Plaj Giyim</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-keten-koleksiyonu/" class="link -grandchild" style="">
                                      <span>
                                      Keten</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-deniz-sortu/" class="link -grandchild" style="">
                                      <span>
                                      Deniz Şortu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-sort-bermuda/" class="link -grandchild" style="">
                                      <span>
                                      Şort &amp; Bermuda</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-gomlek/" class="link -grandchild" style="">
                                      <span>
                                      Gömlek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-desenli-gomlek/" class="link -grandchild" style="">
                                      <span>
                                      Desenli Gömlek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-tisort/" class="link -grandchild" style="">
                                      <span>
                                      Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-atlet/" class="link -grandchild" style="">
                                      <span>
                                      Atlet &amp; Kolsuz Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-aksesuar/" class="link -grandchild" style="">
                                      <span>
                                      Aksesuar</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/erkek-aksesuar/" class="link child-link js-child-link -haschild" style=""><span>Aksesuar</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Aksesuar</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-aksesuar/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-sapka/" class="link -grandchild" style="">
                                      <span>
                                      Şapka</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-parfum/" class="link -grandchild" style="">
                                      <span>
                                      Parfüm</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek&amp;sorter=newcomers" class="link child-link js-child-link -haschild" style="--nav-item-color:#ff0000;"><span>Fırsatlar</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Fırsatlar</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek&amp;attributes_filterable_category=Kot%20%C5%9Eort&amp;attributes_filterable_category=Spor%20%C5%9Eort&amp;attributes_filterable_category=%C5%9Eort%20%26%20Bermuda" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Şortlar</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek&amp;attributes_filterable_category=Ti%C5%9F%C3%B6rt&amp;attributes_filterable_category=Spor%20Ti%C5%9F%C3%B6rt" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Tişörtler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek&amp;attributes_filterable_category=G%C3%B6mlek" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Gömlekler</span>
                                    </a></li></ul>
                            </div>
                          </div></li></ul>
                </div>
              </div></li><li class="mobile-nav__list-item js-mobile-nav-item ">
            <a href="/cocuk-anasayfa" class="link js-tab-link" style="">
              Çocuk
            </a><div class="mobile-nav__menu js-mobile-nav-menu ">
                <div class="mobile-nav__menu-list-w">
                  <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/cocuk-anasayfa" class="link child-link js-child-link " style=""><span>Çocuk Anasayfa</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/cocuk-yazlik-urunler/" class="link child-link js-child-link " style=""><span>Tatil Valizi</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/cocuk-yeni-sezon/?sorter=newcomers" class="link child-link js-child-link " style=""><span>Yeni Gelenler</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/sezonun-cok-satanlari/?attributes_filterable_gender=K%C4%B1z%20%C3%87ocuk&amp;attributes_filterable_gender=Erkek%20%C3%87ocuk" class="link child-link js-child-link " style=""><span>Çok Satanlar</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/cocuk-kiz-cocuk/" class="link child-link js-child-link -haschild" style=""><span>Kız Çocuk (5-14 Yaş)</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Kız Çocuk (5-14 Yaş)</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-kiz-cocuk/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-elbise-tulum/" class="link -grandchild" style="">
                                      <span>
                                      Elbise &amp; Tulum</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-tisort/" class="link -grandchild" style="">
                                      <span>
                                      Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-atlet/" class="link -grandchild" style="">
                                      <span>
                                      Atlet</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-sort/" class="link -grandchild" style="">
                                      <span>
                                      Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-kot-sort/" class="link -grandchild" style="">
                                      <span>
                                      Kot Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-set/" class="link -grandchild" style="">
                                      <span>
                                      Çoklu Paket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Pantolon</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-tayt/" class="link -grandchild" style="">
                                      <span>
                                      Tayt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-kot-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-etek/" class="link -grandchild" style="">
                                      <span>
                                      Etek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-bluz/" class="link -grandchild" style="">
                                      <span>
                                      Bluz</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-gomlek/" class="link -grandchild" style="">
                                      <span>
                                      Gömlek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-sort-etek/" class="link -grandchild" style="">
                                      <span>
                                      Şort Etek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-kot-ceket/" class="link -grandchild" style="">
                                      <span>
                                      Kot Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-tulum-salopet-modelleri/" class="link -grandchild" style="">
                                      <span>
                                      Tulum &amp; Salopet</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-bikini-mayo/" class="link -grandchild" style="">
                                      <span>
                                      Bikini &amp; Mayo</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-sweatshirt/" class="link -grandchild" style="">
                                      <span>
                                      Sweatshirt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-esofman-alti/" class="link -grandchild" style="">
                                      <span>
                                      Eşofman Altı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-dis-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Mevsimlik Mont&amp;Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-yelek/" class="link -grandchild" style="">
                                      <span>
                                      Yelek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-hirka/" class="link -grandchild" style="">
                                      <span>
                                      Hırka</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-aksesuar/" class="link -grandchild" style="">
                                      <span>
                                      Aksesuar</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-sapka/" class="link -grandchild" style="">
                                      <span>
                                      Şapka</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-corap/" class="link -grandchild" style="">
                                      <span>
                                      Çorap</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/cocuk-erkek-cocuk/" class="link child-link js-child-link -haschild" style=""><span>Erkek Çocuk (5-14 Yaş)</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Erkek Çocuk (5-14 Yaş)</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-erkek-cocuk/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-tisort/" class="link -grandchild" style="">
                                      <span>
                                      Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-sort/" class="link -grandchild" style="">
                                      <span>
                                      Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Pantolon</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-kot-sort/" class="link -grandchild" style="">
                                      <span>
                                      Kot Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-kot-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-gomlek/" class="link -grandchild" style="">
                                      <span>
                                      Gömlek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-atlet/" class="link -grandchild" style="">
                                      <span>
                                      Atlet</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-polo-yaka-tisort/?attributes_filterable_gender=Erkek%20%C3%87ocuk" class="link -grandchild" style="">
                                      <span>
                                      Polo Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-sweatshirt/" class="link -grandchild" style="">
                                      <span>
                                      Sweatshirt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-esofman-alti/" class="link -grandchild" style="">
                                      <span>
                                      Eşofman Altı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-dis-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Mevsimlik Mont&amp;Ceket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-set/" class="link -grandchild" style="">
                                      <span>
                                      Çoklu Paket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-deniz-sortu/" class="link -grandchild" style="">
                                      <span>
                                      Deniz Şortu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-boxer/" class="link -grandchild" style="">
                                      <span>
                                      Boxer</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-aksesuar/" class="link -grandchild" style="">
                                      <span>
                                      Aksesuar</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-sapka/" class="link -grandchild" style="">
                                      <span>
                                      Şapka</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-corap/" class="link -grandchild" style="">
                                      <span>
                                      Çorap</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/cocuk-lisans-koleksiyonu/" class="link child-link js-child-link " style=""><span>Lisans Koleksiyonu</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/cocuk-giyim/" class="link child-link js-child-link -haschild" style=""><span>Koleksiyonlar</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Koleksiyonlar</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-yasama-saygi-koleksiyonu/" class="link -grandchild" style="">
                                      <span>
                                      Yaşama Saygı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-yazlik-urunler/" class="link -grandchild" style="">
                                      <span>
                                      Tatil Valizi</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-alt-ust-takim/" class="link -grandchild" style="">
                                      <span>
                                      Alt Üst Takım</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/anne-kiz-uyumu/" class="link -grandchild" style="">
                                      <span>
                                      Anne Kız Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-lisans-koleksiyonu/" class="link -grandchild" style="">
                                      <span>
                                      Lisans Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-keten-pantolon-gomlek-sort-etek/" class="link -grandchild" style="">
                                      <span>
                                      Keten Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-basic-urunler/" class="link -grandchild" style="">
                                      <span>
                                      Basic Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-ataturk-koleksiyonu/" class="link -grandchild" style="">
                                      <span>
                                      Atatürk Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-hediye-onerileri/" class="link -grandchild" style="">
                                      <span>
                                      Hediye Önerileri</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/koton-friends/?attributes_filterable_gender=K%C4%B1z%20%C3%87ocuk&amp;attributes_filterable_gender=Erkek%20%C3%87ocuk" class="link -grandchild" style="">
                                      <span>
                                      Koton Friends</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-pijama-takimlari/" class="link -grandchild" style="">
                                      <span>
                                      Pijama Takımları</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-plaj-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Plaj Giyim</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/cocuk/" class="link child-link js-child-link -haschild" style="--nav-item-color:#000000;"><span>Yaşa Göre Satın Al</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Yaşa Göre Satın Al</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk/?attributes_integration_beden=4%2F5%20Ya%C5%9F" class="link -grandchild" style="">
                                      <span>
                                      4-5 Yaş | 110 cm</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk/?attributes_integration_beden=5%2F6%20Ya%C5%9F" class="link -grandchild" style="">
                                      <span>
                                      5-6 Yaş | 116 cm</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk/?attributes_integration_beden=6%2F7%20Ya%C5%9F" class="link -grandchild" style="">
                                      <span>
                                      6-7 Yaş | 122 cm</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk/?attributes_integration_beden=7%2F8%20Ya%C5%9F" class="link -grandchild" style="">
                                      <span>
                                      7-8 Yaş | 128 cm</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk/?attributes_integration_beden=9%2F10%20Ya%C5%9F" class="link -grandchild" style="">
                                      <span>
                                      9-10 Yaş | 140 cm</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk/?attributes_integration_beden=9%2F10%20Ya%C5%9F" class="link -grandchild" style="">
                                      <span>
                                      11-12 Yaş | 152 cm</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk/?attributes_integration_beden=13%2F14%20Ya%C5%9F" class="link -grandchild" style="">
                                      <span>
                                      13-14 Yaş | 164 cm</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/cocuk-aksesuar-modelleri/" class="link child-link js-child-link -haschild" style=""><span>Aksesuar</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Aksesuar</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-aksesuar-modelleri/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-sapka-modelleri/" class="link -grandchild" style="">
                                      <span>
                                      Şapka</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-corap-modelleri/" class="link -grandchild" style="">
                                      <span>
                                      Çorap</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/cocuk-canta-modelleri/" class="link -grandchild" style="">
                                      <span>
                                      Çanta</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-cocuk-sac-aksesuarlari/" class="link -grandchild" style="">
                                      <span>
                                      Saç Aksesuarları</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek%20Bebek&amp;attributes_filterable_gender=K%C4%B1z%20Bebek&amp;sorter=newcomers" class="link child-link js-child-link -haschild" style="--nav-item-color:#ff0000;"><span>Fırsatlar</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Fırsatlar</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=K%C4%B1z%20%C3%87ocuk&amp;attributes_filterable_gender=Erkek%20%C3%87ocuk&amp;attributes_filterable_category=%C5%9Eort" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=K%C4%B1z%20%C3%87ocuk&amp;attributes_filterable_gender=Erkek%20%C3%87ocuk&amp;attributes_filterable_category=Elbise%20%26%20Tulum" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Elbiseler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=K%C4%B1z%20%C3%87ocuk&amp;attributes_filterable_gender=Erkek%20%C3%87ocuk&amp;attributes_filterable_category=Ti%C5%9F%C3%B6rt" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Tişörtler</span>
                                    </a></li></ul>
                            </div>
                          </div></li></ul>
                </div>
              </div></li><li class="mobile-nav__list-item js-mobile-nav-item ">
            <a href="/bebek-anasayfa" class="link js-tab-link" style="">
              Bebek
            </a><div class="mobile-nav__menu js-mobile-nav-menu ">
                <div class="mobile-nav__menu-list-w">
                  <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/bebek-anasayfa" class="link child-link js-child-link " style=""><span>Bebek Anasayfa</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/bebek-yazlik-urunler/" class="link child-link js-child-link " style=""><span>Tatil Valizi</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/bebek-yeni-sezon/?sorter=newcomers" class="link child-link js-child-link " style=""><span>Yeni Gelenler</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/sezonun-cok-satanlari/?attributes_filterable_gender=Erkek%20Bebek&amp;attributes_filterable_gender=K%C4%B1z%20Bebek" class="link child-link js-child-link " style=""><span>Çok Satanlar</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/bebek-kiz-bebek/" class="link child-link js-child-link -haschild" style=""><span>Kız Bebek (0-5 Yaş)</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Kız Bebek (0-5 Yaş)</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek-kiz-bebek/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-elbise-tulum/" class="link -grandchild" style="">
                                      <span>
                                      Elbise &amp; Tulum</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-tisort/" class="link -grandchild" style="">
                                      <span>
                                      Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-sort/" class="link -grandchild" style="">
                                      <span>
                                      Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-set/" class="link -grandchild" style="">
                                      <span>
                                      Çoklu Paket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-atlet/" class="link -grandchild" style="">
                                      <span>
                                      Atlet</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-tayt/" class="link -grandchild" style="">
                                      <span>
                                      Tayt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-gomlek-bluz/" class="link -grandchild" style="">
                                      <span>
                                      Gömlek &amp; Bluz</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-pantolon-kot-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Pantolon &amp; Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-etek/" class="link -grandchild" style="">
                                      <span>
                                      Etek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-tulum-salopet-modelleri/" class="link -grandchild" style="">
                                      <span>
                                      Tulum &amp; Salopet</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-sweatshirt/" class="link -grandchild" style="">
                                      <span>
                                      Sweatshirt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-esofman-alti/" class="link -grandchild" style="">
                                      <span>
                                      Eşofman Altı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-dis-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Dış Giyim</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-yenidogan-modelleri/" class="link -grandchild" style="">
                                      <span>
                                      Yenidoğan</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/kiz-bebek-bikini-mayo/" class="link -grandchild" style="">
                                      <span>
                                      Bikini&amp;Mayo</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/bebek-erkek-bebek/" class="link child-link js-child-link -haschild" style=""><span>Erkek Bebek (0-5 Yaş)</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Erkek Bebek (0-5 Yaş)</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek-erkek-bebek/" class="link -grandchild" style="">
                                      <span>
                                      Tüm Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-bebek-tisort/" class="link -grandchild" style="">
                                      <span>
                                      Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-bebek-sort/" class="link -grandchild" style="">
                                      <span>
                                      Şort</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-bebek-gomlek/" class="link -grandchild" style="">
                                      <span>
                                      Gömlek</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-bebek-pantolon-kot-pantolon/" class="link -grandchild" style="">
                                      <span>
                                      Pantolon &amp; Jeans</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-bebek-set/" class="link -grandchild" style="">
                                      <span>
                                      Çoklu Paket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-bebek-atlet/" class="link -grandchild" style="">
                                      <span>
                                      Atlet</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-cocuk-polo-yaka-tisort/?attributes_filterable_gender=Erkek%20Bebek" class="link -grandchild" style="">
                                      <span>
                                      Polo Tişört</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-bebek-sweatshirt/" class="link -grandchild" style="">
                                      <span>
                                      Sweatshirt</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-bebek-esofman-alti/" class="link -grandchild" style="">
                                      <span>
                                      Eşofman Altı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-bebek-tulum/" class="link -grandchild" style="">
                                      <span>
                                      Tulum</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-bebek-dis-giyim/" class="link -grandchild" style="">
                                      <span>
                                      Dış Giyim</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-bebek-yenidogan-modelleri/" class="link -grandchild" style="">
                                      <span>
                                      Yenidoğan</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/erkek-bebek-deniz-sortu/" class="link -grandchild" style="">
                                      <span>
                                      Mayo &amp; Deniz Şortu</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/bebek-lisans-koleksiyonu/" class="link child-link js-child-link " style=""><span>Lisans Koleksiyonu</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/bebek-giyim/" class="link child-link js-child-link -haschild" style=""><span>Koleksiyonlar</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Koleksiyonlar</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek-yasama-saygi-koleksiyonu/" class="link -grandchild" style="">
                                      <span>
                                      Yaşama Saygı</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek-yazlik-urunler/" class="link -grandchild" style="">
                                      <span>
                                      Tatil Valizi</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek-pamuklu-urunler/" class="link -grandchild" style="">
                                      <span>
                                      %100 Pamuklu Ürünler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek-alt-ust-takim/" class="link -grandchild" style="">
                                      <span>
                                      Alt Üst Takım</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek-coklu-paket/" class="link -grandchild" style="">
                                      <span>
                                      Çoklu Paket</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek-basic-urunler/" class="link -grandchild" style="">
                                      <span>
                                      Basic Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek-lisans-koleksiyonu/" class="link -grandchild" style="">
                                      <span>
                                      Lisans Koleksiyonu</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek-renkli-giyim-modelleri/" class="link -grandchild" style="">
                                      <span>
                                      Favori Renkler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek-hayvanlar-alemi/" class="link -grandchild" style="">
                                      <span>
                                      Hayvanlar Alemi</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek-hediye-onerileri/" class="link -grandchild" style="">
                                      <span>
                                      Hediye Önerileri</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/yenidogan-modelleri/" class="link -grandchild" style="">
                                      <span>
                                      Yenidoğan</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/bebek/" class="link child-link js-child-link -haschild" style="--nav-item-color:#000000;"><span>Yaşa Göre Satın Al</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Yaşa Göre Satın Al</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek/?attributes_integration_beden=9%2F12%20Ay" class="link -grandchild" style="">
                                      <span>
                                      9-12 Ay | 80 cm</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek/?attributes_integration_beden=12%2F18%20Ay" class="link -grandchild" style="">
                                      <span>
                                      12-18 Ay | 86 cm</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek/?attributes_integration_beden=18%2F24%20Ay" class="link -grandchild" style="">
                                      <span>
                                      18-24 Ay | 92 cm</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek/?attributes_integration_beden=24%2F36%20Ay" class="link -grandchild" style="">
                                      <span>
                                      24-36 Ay | 98 cm</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek/?attributes_integration_beden=3%2F4%20Ya%C5%9F" class="link -grandchild" style="">
                                      <span>
                                      3-4 Yaş | 104 cm</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/bebek/?attributes_integration_beden=4%2F5%20Ya%C5%9F" class="link -grandchild" style="">
                                      <span>
                                      4-5 Yaş  | 110 cm</span>
                                    </a></li></ul>
                            </div>
                          </div></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek%20Bebek&amp;attributes_filterable_gender=K%C4%B1z%20Bebek&amp;sorter=newcomers" class="link child-link js-child-link -haschild" style="--nav-item-color:#ff0000;"><span>Fırsatlar</span>
                        </a><div class="mobile-nav__menu js-mobile-nav-menu">
                            <header class="mobile-nav__menu-header">
                              <pz-button icon="chevron-left" appearance="ghost" size="xs" class="js-mobile-nav-back-btn pz-button -icon-left -appearance-ghost -size-xs">
      <i class="pz-button__icon pz-icon-chevron-left"></i>
      
      <span class="pz-button__text">Geri</span>
    </pz-button>
                              <span class="mobile-nav__menu-header-title">Fırsatlar</span>
                            </header>
                            <div class="mobile-nav__menu-list-w">
                              <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=K%C4%B1z%20Bebek&amp;attributes_filterable_category=Elbise%20%26%20Tulum" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Elbiseler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek%20Bebek&amp;attributes_filterable_gender=K%C4%B1z%20Bebek&amp;attributes_filterable_category=Ti%C5%9F%C3%B6rt" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Tişörtler</span>
                                    </a></li><li class="mobile-nav__list-item js-mobile-nav-item -no-border">
                                    <a href="/15-30-40-indirimleri/?attributes_filterable_gender=Erkek%20Bebek&amp;attributes_filterable_gender=K%C4%B1z%20Bebek&amp;attributes_filterable_category=%C5%9Eort" class="link -grandchild" style="">
                                      <span>
                                      Çok Satan Şort</span>
                                    </a></li></ul>
                            </div>
                          </div></li></ul>
                </div>
              </div></li><li class="mobile-nav__list-item js-mobile-nav-item ">
            <a href="/indirim-anasayfa" class="link js-tab-link" style="">
              Fırsatlar
            </a><div class="mobile-nav__menu js-mobile-nav-menu ">
                <div class="mobile-nav__menu-list-w">
                  <ul class="mobile-nav__menu-list"><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/indirim-anasayfa" class="link child-link js-child-link " style=""><span>Fırsatlar Ana Sayfa</span>
                        </a></li><li class="mobile-nav__list-item js-mobile-nav-item">
                        <a href="/kampanyali-urunler-net50/" class="link child-link js-child-link " style=""><span>Net %50 İndirim</span>
                        </a></li></ul>
                </div>
              </div></li><li class="mobile-nav__list-item js-mobile-nav-item ">
            <a href="/yasama-saygi-manifestosu" class="link js-tab-link" style="">
              Sürdürülebilirlik
            </a></li></ul>
  </div>
  <footer class="mobile-nav__footer">
    <div class="mobile-nav__footer-wrapper">
      <div class="mobile-nav__footer-item"><a href="/users/auth/?next=/erkek-tisort/" class="link">
            <i class="icon pz-icon-user"></i>
            <span class="label">
              GİRİŞ YAP | KAYIT OL
            </span>
          </a></div><div class="mobile-nav__footer-item"><div class="language-form-modal-container js-language-form-container ">
    <div class="language-form-modal-wrapper">
      <div class="js-language-button language-form-modal-button">
        <i class="pz-icon-earth"></i>
        <span class="language-form-modal-text">Türkçe</span>

        <span class="language-form-modal-text -short">TR</span>

        <i class="pz-icon-chevron-down"></i>
      </div>

      <div class="language-form-modal js-language-modal" hidden="">
        <div class="language-form-modal-close js-language-modal-close">
          <span class="-close"></span>
        </div>

        <div class="language-form-modal-title">Dil Seçimi</div>
        <div class="language-form-modal-header">
          Dil Seçenekleri
        </div><form class="js-language-form language-form active" method="POST" action="/setlang/"><input type="hidden" name="csrfmiddlewaretoken" value="P4KV9wv4Glf4KwsYaK6UFcVIgfRwLirvr2MfsFLw1xHGKKv9PXqlFngM5hfPUWmQ"><input type="hidden" name="next" value="/erkek-tisort/">
          <input type="hidden" name="language" value="tr-tr"><button type="submit" class="active">
              Türkçe
              <span><i class="pz-icon-check js-check-icon"></i></span>
            </button></form><form class="js-language-form language-form " method="POST" action="/setlang/"><input type="hidden" name="csrfmiddlewaretoken" value="P4KV9wv4Glf4KwsYaK6UFcVIgfRwLirvr2MfsFLw1xHGKKv9PXqlFngM5hfPUWmQ"><input type="hidden" name="next" value="/erkek-tisort/">
          <input type="hidden" name="language" value="en-us"><button type="submit" class="">
              English
              <span><i class="pz-icon-check js-check-icon" hidden=""></i></span>
            </button></form><pz-button class="js-language-modal-confirm language-form-modal-container-mobile-confirm pz-button -appearance-filled">
      
      
      <span class="pz-button__text">Kaydet</span>
    </pz-button>
      </div>
    </div>
</div></div>
    </div>
    <div class="mobile-nav__footer-kotonclub">
      <a href="/kotonclub-anasayfa/">
        <img loading="lazy" alt="Koton Club Cart" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/kotonclub.svg">
      </a>
    </div>
  </footer>
</div></header><div class="header__search js-header-search">
  <div hidden="" class="header__search-loader-wrapper js-search-loader-wrapper"></div>
  <div id="AutocompleteDropdown" class="search-result js-search-result"></div>
</div>

      <div class="horizontal-bar -fake js-horizontal-bar-fake">
        <div class="horizontal-bar__container">
          <div class="horizontal-bar__row -primary">
            <div class="horizontal-bar__col -left">
              <div class="-relative"><div class="btn-toggle-sidebar -show-filters pz-button js-btn-toggle-sidebar-fake -icon-left -appearance-filled">
                    <i class="pz-button__icon pz-icon-chevron-up"></i>
                    <span class="pz-button__text">FİLTRELERİ GÖSTER</span>
                  </div></div>
            </div>
            <div class="horizontal-bar__col -center -only-mobile">
              <div class="result  js-result-count-fake">
    1.499 Ürün
  </div>
            </div>
            <div class="horizontal-bar__col -right">
              <div class="horizontal-bar__items">
      
                <div class="js-sorter-fake pz-select -inline-label -has-value">
                  <div class="pz-select-w ">
                    <button class="pz-select-w__button toggle-button" type="button" aria-label="null">
                      <span class="pz-select-w__label">Sırala</span>
                      <i class="pz-select-w__chevron pz-icon-chevron-down"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    
  </div>

</div><div hidden="" class="js-analytics-category-data" data-pk="576"></div><div class="category-header__items">
  <div class="banners"></div>

  <div class="banners type-3-text">
  <div class="banner-type-3  
    
    -not-bg
    -not-border
    "><div class="banner-type-3__container">
        <div class="banner-type-3__card-container"><div class="banner-type-3__text-container">
            <pz-carousel class="-text pz-carousel -direction-horizontal -intersected -controls-over -mounted" auto-width="true" per-view="auto" space="10px" controls="over" controls-distance="-2rem">
      <div class="pz-carousel__container splide is-overflow is-initialized splide--slide splide--ltr splide--draggable is-active" id="splide04" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide04-track" style="padding-left: 10px; padding-right: 15px;" aria-live="polite" aria-atomic="true">
          <ul class="pz-carousel__list splide__list" id="splide04-list" role="presentation" style="transform: translateX(0px);"><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide04-slide01" role="group" aria-roledescription="slide" aria-label="1 of 14" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Polo Yaka Tişört" role="link" target="_blank" href="/erkek-polo-tisort/">Polo Yaka Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide is-visible is-next" id="splide04-slide02" role="group" aria-roledescription="slide" aria-label="2 of 14" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Basic Tişört" role="link" target="_blank" href="/erkek-basic-tisort/">Basic Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide is-visible" id="splide04-slide03" role="group" aria-roledescription="slide" aria-label="3 of 14" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Baskılı Tişört" role="link" target="_blank" href="/erkek-baskili-tisort/">Baskılı Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide is-visible" id="splide04-slide04" role="group" aria-roledescription="slide" aria-label="4 of 14" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Oversize Tişört" role="link" target="_blank" href="/erkek-oversize-tisort/">Oversize Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide is-visible" id="splide04-slide05" role="group" aria-roledescription="slide" aria-label="5 of 14" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Çizgili Tişört" role="link" target="_blank" href="/erkek-cizgili-gomlek-pantolon-tisort/?attributes_filterable_category=Spor%20Ti%C5%9F%C3%B6rt&amp;attributes_filterable_category=Ti%C5%9F%C3%B6rt&amp;attributes_filterable_category=Polo%20Ti%C5%9F%C3%B6rt">Çizgili Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide is-visible" id="splide04-slide06" role="group" aria-roledescription="slide" aria-label="6 of 14" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Triko Tişört" role="link" target="_blank" href="/triko-tisort-erkek/">Triko Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide is-visible" id="splide04-slide07" role="group" aria-roledescription="slide" aria-label="7 of 14" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Lisanslı Tişört" role="link" target="_blank" href="/erkek-lisansli-tisort/">Lisanslı Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide" id="splide04-slide08" role="group" aria-roledescription="slide" aria-label="8 of 14" aria-hidden="true" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Atlet &amp; Kolsuz Tişört" role="link" target="_blank" href="/erkek-atlet/" tabindex="-1">Atlet &amp; Kolsuz Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide" id="splide04-slide09" role="group" aria-roledescription="slide" aria-label="9 of 14" aria-hidden="true" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Slim Fit Tişört" role="link" target="_blank" href="/erkek-tisort/?attributes_filterable_fit=Slim%20Fit&amp;sorter=newcomers" tabindex="-1">Slim Fit Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide" id="splide04-slide10" role="group" aria-roledescription="slide" aria-label="10 of 14" aria-hidden="true" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Regular Fit Tişört" role="link" target="_blank" href="/erkek-tisort/?attributes_filterable_fit=Regular" tabindex="-1">Regular Fit Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide" id="splide04-slide11" role="group" aria-roledescription="slide" aria-label="11 of 14" aria-hidden="true" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Bisiklet Yaka Tişört" role="link" target="_blank" href="/erkek-bisiklet-yaka-tisort/" tabindex="-1">Bisiklet Yaka Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide" id="splide04-slide12" role="group" aria-roledescription="slide" aria-label="12 of 14" aria-hidden="true" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="V Yaka Tişört" role="link" target="_blank" href="/erkek-v-yaka-tisort/" tabindex="-1">V Yaka Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide" id="splide04-slide13" role="group" aria-roledescription="slide" aria-label="13 of 14" aria-hidden="true" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Uzun Kollu Tişört" role="link" target="_blank" href="/erkek-uzun-kollu-tisort/" tabindex="-1">Uzun Kollu Tişört</a>
                  </div></li><li class="pz-carousel__slide splide__slide" id="splide04-slide14" role="group" aria-roledescription="slide" aria-label="14 of 14" aria-hidden="true" style="margin-right: 10px;"><div class="banner-type-3__text">
                    <a aria-label="Spor Tişört" role="link" target="_blank" href="/erkek-spor-tisort/" tabindex="-1">Spor Tişört</a>
                  </div></li></ul>
        </div>
      </div>
    <div class="pz-carousel__controls"><button class="pz-carousel__control-button -prev -disable" aria-label="Geri" style="left: -2rem;"></button><button class="pz-carousel__control-button -next" aria-label="İleri" style="right: -2rem;"></button></div></pz-carousel>
          </div></div>
      </div></div>
</div><div class="category-header-text"><h1 class="category-header-text__title">Erkek Tişört, Mavi Tişört Erkek ve Oversize Tişört Modelleri</h1></div><div class="list__breadcrumb"><div class="breadcrumb "><a href="/" class="breadcrumb__link">
            Anasayfa
          </a><span class="breadcrumb__divider ">
              /
            </span><a href="/erkek-anasayfa" class="breadcrumb__link">
            Erkek
          </a><span class="breadcrumb__divider ">
              /
            </span><a href="/erkek-giyim/" class="breadcrumb__link">
            Giyim
          </a><span class="breadcrumb__divider ">
              /
            </span><span class="breadcrumb__text">
            Tişört
          </span>
    </div><script type="application/ld+json">
    {
      "@context": "http://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Anasayfa",
          "item": "https://www.koton.com"
        },{
              "@type": "ListItem",
              "position": 2,
              "name": "Erkek",
              "item": "https://www.koton.com/erkek-anasayfa"
            },{
              "@type": "ListItem",
              "position": 3,
              "name": "Giyim",
              "item": "https://www.koton.com/erkek-giyim/"
            },{
              "@type": "ListItem",
              "position": 4,
              "name": "Tişört",
              "item": "https://www.koton.com/erkek-tisort/"
            }]
    }
  </script></div>
</div>

<section class="list js-list -hidden-sidebar" data-real-layout="2" data-layout="2" data-default-page-size="24" data-default-layout="2" data-result="1499" data-filter="false"><div class="horizontal-bar">
  <div class="horizontal-bar__container js-horizontal-bar" style="top: 90px;">
    <div class="horizontal-bar__row -primary">
      <div class="horizontal-bar__col -left">
        <div class="-relative">
          <div class="overlay-local js-overlay-local js-open-mobile-filters">
    
  </div><pz-button icon="chevron-up" class="btn-toggle-sidebar js-btn-toggle-sidebar js-toggle-sidebar -show-filters pz-button -icon-left -appearance-filled">
      <i class="pz-button__icon pz-icon-chevron-up"></i>
      
      <span class="pz-button__text">FİLTRELERİ GÖSTER</span>
    </pz-button>
            </div>
      </div>
      <div class="horizontal-bar__col -center -only-mobile">
        <div class="result  js-result-count">
    1.499 Ürün
  </div>
      </div>
      <div class="horizontal-bar__col -right">
        <div class="horizontal-bar__items -page-loaded">
          <div class="layout-changer -only-desktop"><label for="layout">
        GÖRÜNTÜLE
      </label>
      <input type="range" name="layout" id="layout" class="js-layout-changer" value="2" min="0" max="3"></div>
          <div class="result -only-desktop js-result-count">
    1.499 Ürün
  </div>
          <pz-select class="sorter js-sorter pz-select -inline-label -has-value" name="sorter">
      <div class="pz-select-w ">
        <button class="pz-select-w__button toggle-button" type="button" name="button-sorter" aria-label="button-sorter">
          <i class="pz-select-w__chevron pz-icon-chevron-down"></i>
          <span class="pz-select-w__label">Sırala</span>
        </button>
        <select name="sorter" aria-label="sorter" class="pz-form-input" id="pz-form-input-897"><option value="default" selected="" class="-selected">
                Önerilen
              </option><option value="price">
                Fiyat Artan
              </option><option value="-price">
                Fiyat Azalan
              </option><option value="newcomers">
                Yeni Gelenler
              </option></select>
        <div class="pz-select-w__overlay toggle-button"></div>
        <div class="pz-select-w__wrapper">
          
          <ol class="pz-select-w__list"><li value="default" selected="" data-value="default" class="-selected">
                Önerilen
              </li><li value="price" data-value="price">
                Fiyat Artan
              </li><li value="-price" data-value="-price">
                Fiyat Azalan
              </li><li value="newcomers" data-value="newcomers">
                Yeni Gelenler
              </li></ol>
        </div>
      </div>
    </pz-select>
          
        </div>
      </div>
    </div>
  </div>
  <div class="horizontal-bar__container -only-mobile">
    <div class="horizontal-bar__row">
      <div class="horizontal-bar__col">
        <div class="layout-changer "><input type="range" aria-label="Change Layout" class="js-layout-changer" value="2" min="0" max="3"></div>
      </div>
    </div>
  </div>
</div><div class="list__body"><div class="list__sidebar js-list-sidebar" data-default-title="FİLTRELE">
  <div class="list__sidebar-title">
    <i class="pz-icon-chevron-left js-list-close-accordion"></i>

    <span class="js-sidebar-title">FİLTRELE</span></div>

  <div class="list__sidebar-filterbox js-sidebar-filters-box">
    <div class="filters js-filters"><pz-expandable no-semantic="true" title="cinsiyet" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -default &quot;&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;erkek&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_gender&quot; value=&quot;Erkek&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;erkek&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1499)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;/div&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">cinsiyet</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -default "><div class="filter-item__items"><label class="choice js-filter-choice-label  " data-label="erkek">
    <input type="checkbox" name="attributes_filterable_gender" value="Erkek" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">erkek</span>
      <span class="choice__quantity">(1499)</span>
    </div>
  </label></div></div>
          </div>
        </div>
      </pz-expandable><pz-expandable no-semantic="true" title="kategori" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -default &quot;&gt;&lt;div class=&quot;filter-item__search &quot;&gt;
                  &lt;input type=&quot;text&quot; class=&quot;filter-item__search-input js-list-search-input&quot; data-key=&quot;filterable_category&quot; placeholder=&quot;Arama&quot;&gt;
                &lt;/div&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;atlet&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_category&quot; value=&quot;Atlet&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;atlet&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;kazak &amp;amp; süveter&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_category&quot; value=&quot;Kazak &amp;amp; Süveter&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;kazak &amp;amp; süveter&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(84)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;polo tişört&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_category&quot; value=&quot;Polo Tişört&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;polo tişört&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(220)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;spor tişört&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_category&quot; value=&quot;Spor Tişört&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;spor tişört&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(45)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;tişört&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_category&quot; value=&quot;Tişört&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;tişört&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1149)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;/div&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">kategori</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -default "><div class="filter-item__search ">
                  <input type="text" class="filter-item__search-input js-list-search-input" data-key="filterable_category" placeholder="Arama">
                </div><div class="filter-item__items"><label class="choice js-filter-choice-label  " data-label="atlet">
    <input type="checkbox" name="attributes_filterable_category" value="Atlet" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">atlet</span>
      <span class="choice__quantity">(1)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="kazak &amp; süveter">
    <input type="checkbox" name="attributes_filterable_category" value="Kazak &amp; Süveter" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">kazak &amp; süveter</span>
      <span class="choice__quantity">(84)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="polo tişört">
    <input type="checkbox" name="attributes_filterable_category" value="Polo Tişört" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">polo tişört</span>
      <span class="choice__quantity">(220)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="spor tişört">
    <input type="checkbox" name="attributes_filterable_category" value="Spor Tişört" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">spor tişört</span>
      <span class="choice__quantity">(45)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="tişört">
    <input type="checkbox" name="attributes_filterable_category" value="Tişört" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">tişört</span>
      <span class="choice__quantity">(1149)</span>
    </div>
  </label></div></div>
          </div>
        </div>
      </pz-expandable><pz-expandable no-semantic="true" title="fiyat aralığı" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -default &quot;&gt;&lt;div class=&quot;filter-item__search &quot;&gt;
                  &lt;input type=&quot;text&quot; class=&quot;filter-item__search-input js-list-search-input&quot; data-key=&quot;price&quot; placeholder=&quot;Arama&quot;&gt;
                &lt;/div&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;0₺ - 300₺&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;price&quot; value=&quot;0-300&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;0₺ - 300₺&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(115)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;300₺ - 600₺&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;price&quot; value=&quot;300-600&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;300₺ - 600₺&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(763)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;600₺ - 900₺&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;price&quot; value=&quot;600-900&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;600₺ - 900₺&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(346)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;900₺ - 1100₺&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;price&quot; value=&quot;900-1100&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;900₺ - 1100₺&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(29)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;+1100₺ &quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;price&quot; value=&quot;1100&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;+1100₺ &lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(69)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;/div&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">fiyat aralığı</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -default "><div class="filter-item__search ">
                  <input type="text" class="filter-item__search-input js-list-search-input" data-key="price" placeholder="Arama">
                </div><div class="filter-item__items"><label class="choice js-filter-choice-label  " data-label="0₺ - 300₺">
    <input type="checkbox" name="price" value="0-300" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">0₺ - 300₺</span>
      <span class="choice__quantity">(115)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="300₺ - 600₺">
    <input type="checkbox" name="price" value="300-600" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">300₺ - 600₺</span>
      <span class="choice__quantity">(763)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="600₺ - 900₺">
    <input type="checkbox" name="price" value="600-900" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">600₺ - 900₺</span>
      <span class="choice__quantity">(346)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="900₺ - 1100₺">
    <input type="checkbox" name="price" value="900-1100" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">900₺ - 1100₺</span>
      <span class="choice__quantity">(29)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="+1100₺ ">
    <input type="checkbox" name="price" value="1100" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">+1100₺ </span>
      <span class="choice__quantity">(69)</span>
    </div>
  </label></div></div>
          </div>
        </div>
      </pz-expandable><pz-expandable no-semantic="true" title="beden" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -size &quot;&gt;&lt;div class=&quot;filter-item__search &quot;&gt;
                  &lt;input type=&quot;text&quot; class=&quot;filter-item__search-input js-list-search-input&quot; data-key=&quot;integration_beden&quot; placeholder=&quot;Arama&quot;&gt;
                &lt;/div&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;label class=&quot;choice js-filter-choice-label &quot; data-label=&quot;XS&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_beden&quot; value=&quot;XS&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;span&gt;XS&lt;/span&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label &quot; data-label=&quot;S&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_beden&quot; value=&quot;S&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;span&gt;S&lt;/span&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label &quot; data-label=&quot;M&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_beden&quot; value=&quot;M&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;span&gt;M&lt;/span&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label &quot; data-label=&quot;L&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_beden&quot; value=&quot;L&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;span&gt;L&lt;/span&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label &quot; data-label=&quot;XL&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_beden&quot; value=&quot;XL&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;span&gt;XL&lt;/span&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label &quot; data-label=&quot;XXL&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_beden&quot; value=&quot;XXL&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;span&gt;XXL&lt;/span&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label &quot; data-label=&quot;3XL&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_beden&quot; value=&quot;3XL&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;span&gt;3XL&lt;/span&gt;
  &lt;/label&gt;&lt;/div&gt;&lt;pz-button appearance=&quot;ghost&quot; class=&quot;show-more-trigger js-show-more-trigger pz-button -appearance-ghost&quot;&gt;
      
      
      &lt;span class=&quot;pz-button__text&quot;&gt;Daha Fazla Göster&lt;/span&gt;
    &lt;/pz-button&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">beden</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -size "><div class="filter-item__search ">
                  <input type="text" class="filter-item__search-input js-list-search-input" data-key="integration_beden" placeholder="Arama">
                </div><div class="filter-item__items"><label class="choice js-filter-choice-label " data-label="XS">
    <input type="checkbox" name="attributes_integration_beden" value="XS" class="js-filter-choice">
    <span>XS</span>
  </label><label class="choice js-filter-choice-label " data-label="S">
    <input type="checkbox" name="attributes_integration_beden" value="S" class="js-filter-choice">
    <span>S</span>
  </label><label class="choice js-filter-choice-label " data-label="M">
    <input type="checkbox" name="attributes_integration_beden" value="M" class="js-filter-choice">
    <span>M</span>
  </label><label class="choice js-filter-choice-label " data-label="L">
    <input type="checkbox" name="attributes_integration_beden" value="L" class="js-filter-choice">
    <span>L</span>
  </label><label class="choice js-filter-choice-label " data-label="XL">
    <input type="checkbox" name="attributes_integration_beden" value="XL" class="js-filter-choice">
    <span>XL</span>
  </label><label class="choice js-filter-choice-label " data-label="XXL">
    <input type="checkbox" name="attributes_integration_beden" value="XXL" class="js-filter-choice">
    <span>XXL</span>
  </label><label class="choice js-filter-choice-label " data-label="3XL">
    <input type="checkbox" name="attributes_integration_beden" value="3XL" class="js-filter-choice">
    <span>3XL</span>
  </label></div><pz-button appearance="ghost" class="show-more-trigger js-show-more-trigger pz-button -appearance-ghost">
      
      
      <span class="pz-button__text">Daha Fazla Göster</span>
    </pz-button></div>
          </div>
        </div>
      </pz-expandable><pz-expandable no-semantic="true" title="renk" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -color &quot;&gt;&lt;div class=&quot;filter-item__search hide-input&quot;&gt;
                  &lt;input type=&quot;text&quot; class=&quot;filter-item__search-input js-list-search-input&quot; data-key=&quot;filterable_color&quot; placeholder=&quot;Arama&quot;&gt;
                &lt;/div&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;div class=&quot;options options--color&quot;&gt;
  &lt;div class=&quot;options__items&quot;&gt;&lt;div class=&quot;option&quot; choice=&quot;Siyah&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Siyah&quot; style=&quot;background-color: #000000;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Siyah&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(295)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Ekru&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Ekru&quot; style=&quot;background-color: #C2B280;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Ekru&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(228)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Beyaz&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Beyaz&quot; style=&quot;background-color: #FFFFFF;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Beyaz&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(219)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Yeşil&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Yeşil&quot; style=&quot;background-color: #759D45;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Yeşil&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(210)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Lacivert&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Lacivert&quot; style=&quot;background-color: #120A8F;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Lacivert&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(123)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Gri&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Gri&quot; style=&quot;background-color: #B4B0B0;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Gri&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(127)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Mavi&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Mavi&quot; style=&quot;background-color: #0000FF;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Mavi&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(96)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Kahve&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Kahve&quot; style=&quot;background-color: #964B00;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Kahve&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(98)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Bordo&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Bordo&quot; style=&quot;background-color: #4C0013;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Bordo&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(23)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Kırmızı&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Kırmızı&quot; style=&quot;background-color: #D0011B;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Kırmızı&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(15)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Pembe&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Pembe&quot; style=&quot;background-color: #F6A8E8;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Pembe&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(17)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Sarı&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Sarı&quot; style=&quot;background-color: #F8E81C;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Sarı&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(13)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Mor&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Mor&quot; style=&quot;background-color: #B390D2;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Mor&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(12)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;div class=&quot;option&quot; choice=&quot;Turuncu&quot;&gt;
        &lt;label class=&quot;option__label &quot;&gt;
          &lt;div class=&quot;checkbox-selected&quot;&gt;&lt;/div&gt;
          &lt;input class=&quot;checkbox js-filter-choice&quot; type=&quot;checkbox&quot; name=&quot;attributes_filterable_color&quot; value=&quot;Turuncu&quot; style=&quot;background-color: #F6A623;&quot;&gt;
          &lt;div class=&quot;option__texts&quot;&gt;
            &lt;span class=&quot;option__label-text&quot;&gt;Turuncu&lt;/span&gt;
            &lt;span class=&quot;option__quantity-text&quot;&gt;(8)&lt;/span&gt;
          &lt;/div&gt;
        &lt;/label&gt;
      &lt;/div&gt;&lt;/div&gt;
&lt;/div&gt;&lt;/div&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">renk</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -color "><div class="filter-item__search hide-input">
                  <input type="text" class="filter-item__search-input js-list-search-input" data-key="filterable_color" placeholder="Arama">
                </div><div class="filter-item__items"><div class="options options--color">
  <div class="options__items"><div class="option" choice="Siyah">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Siyah" style="background-color: #000000;">
          <div class="option__texts">
            <span class="option__label-text">Siyah</span>
            <span class="option__quantity-text">(295)</span>
          </div>
        </label>
      </div><div class="option" choice="Ekru">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Ekru" style="background-color: #C2B280;">
          <div class="option__texts">
            <span class="option__label-text">Ekru</span>
            <span class="option__quantity-text">(228)</span>
          </div>
        </label>
      </div><div class="option" choice="Beyaz">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Beyaz" style="background-color: #FFFFFF;">
          <div class="option__texts">
            <span class="option__label-text">Beyaz</span>
            <span class="option__quantity-text">(219)</span>
          </div>
        </label>
      </div><div class="option" choice="Yeşil">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Yeşil" style="background-color: #759D45;">
          <div class="option__texts">
            <span class="option__label-text">Yeşil</span>
            <span class="option__quantity-text">(210)</span>
          </div>
        </label>
      </div><div class="option" choice="Lacivert">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Lacivert" style="background-color: #120A8F;">
          <div class="option__texts">
            <span class="option__label-text">Lacivert</span>
            <span class="option__quantity-text">(123)</span>
          </div>
        </label>
      </div><div class="option" choice="Gri">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Gri" style="background-color: #B4B0B0;">
          <div class="option__texts">
            <span class="option__label-text">Gri</span>
            <span class="option__quantity-text">(127)</span>
          </div>
        </label>
      </div><div class="option" choice="Mavi">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Mavi" style="background-color: #0000FF;">
          <div class="option__texts">
            <span class="option__label-text">Mavi</span>
            <span class="option__quantity-text">(96)</span>
          </div>
        </label>
      </div><div class="option" choice="Kahve">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Kahve" style="background-color: #964B00;">
          <div class="option__texts">
            <span class="option__label-text">Kahve</span>
            <span class="option__quantity-text">(98)</span>
          </div>
        </label>
      </div><div class="option" choice="Bordo">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Bordo" style="background-color: #4C0013;">
          <div class="option__texts">
            <span class="option__label-text">Bordo</span>
            <span class="option__quantity-text">(23)</span>
          </div>
        </label>
      </div><div class="option" choice="Kırmızı">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Kırmızı" style="background-color: #D0011B;">
          <div class="option__texts">
            <span class="option__label-text">Kırmızı</span>
            <span class="option__quantity-text">(15)</span>
          </div>
        </label>
      </div><div class="option" choice="Pembe">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Pembe" style="background-color: #F6A8E8;">
          <div class="option__texts">
            <span class="option__label-text">Pembe</span>
            <span class="option__quantity-text">(17)</span>
          </div>
        </label>
      </div><div class="option" choice="Sarı">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Sarı" style="background-color: #F8E81C;">
          <div class="option__texts">
            <span class="option__label-text">Sarı</span>
            <span class="option__quantity-text">(13)</span>
          </div>
        </label>
      </div><div class="option" choice="Mor">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Mor" style="background-color: #B390D2;">
          <div class="option__texts">
            <span class="option__label-text">Mor</span>
            <span class="option__quantity-text">(12)</span>
          </div>
        </label>
      </div><div class="option" choice="Turuncu">
        <label class="option__label ">
          <div class="checkbox-selected"></div>
          <input class="checkbox js-filter-choice" type="checkbox" name="attributes_filterable_color" value="Turuncu" style="background-color: #F6A623;">
          <div class="option__texts">
            <span class="option__label-text">Turuncu</span>
            <span class="option__quantity-text">(8)</span>
          </div>
        </label>
      </div></div>
</div></div></div>
          </div>
        </div>
      </pz-expandable><pz-expandable no-semantic="true" title="silüet" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -default &quot;&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;basic&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_stil_siluet&quot; value=&quot;Basic&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;basic&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(593)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;klasik&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_stil_siluet&quot; value=&quot;Klasik&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;klasik&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(7)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;boxy&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_stil_siluet&quot; value=&quot;Boxy&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;boxy&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(119)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;/div&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">silüet</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -default "><div class="filter-item__items"><label class="choice js-filter-choice-label  " data-label="basic">
    <input type="checkbox" name="attributes_filterable_stil_siluet" value="Basic" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">basic</span>
      <span class="choice__quantity">(593)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="klasik">
    <input type="checkbox" name="attributes_filterable_stil_siluet" value="Klasik" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">klasik</span>
      <span class="choice__quantity">(7)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="boxy">
    <input type="checkbox" name="attributes_filterable_stil_siluet" value="Boxy" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">boxy</span>
      <span class="choice__quantity">(119)</span>
    </div>
  </label></div></div>
          </div>
        </div>
      </pz-expandable><pz-expandable no-semantic="true" title="boy" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -default &quot;&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;crop&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_boy&quot; value=&quot;Crop&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;crop&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;standart&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_boy&quot; value=&quot;Standart&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;standart&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1347)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;uzun&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_boy&quot; value=&quot;Uzun&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;uzun&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(118)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;/div&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">boy</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -default "><div class="filter-item__items"><label class="choice js-filter-choice-label  " data-label="crop">
    <input type="checkbox" name="attributes_filterable_boy" value="Crop" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">crop</span>
      <span class="choice__quantity">(1)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="standart">
    <input type="checkbox" name="attributes_filterable_boy" value="Standart" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">standart</span>
      <span class="choice__quantity">(1347)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="uzun">
    <input type="checkbox" name="attributes_filterable_boy" value="Uzun" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">uzun</span>
      <span class="choice__quantity">(118)</span>
    </div>
  </label></div></div>
          </div>
        </div>
      </pz-expandable><pz-expandable no-semantic="true" title="kol tipi" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -default &quot;&gt;&lt;div class=&quot;filter-item__search &quot;&gt;
                  &lt;input type=&quot;text&quot; class=&quot;filter-item__search-input js-list-search-input&quot; data-key=&quot;filterable_kol_tipi&quot; placeholder=&quot;Arama&quot;&gt;
                &lt;/div&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;balon kol&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_kol_tipi&quot; value=&quot;Balon Kol&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;balon kol&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(25)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;düşük omuz&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_kol_tipi&quot; value=&quot;Düşük Omuz&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;düşük omuz&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1435)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;kısa kol&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_kol_tipi&quot; value=&quot;Kısa Kol&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;kısa kol&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;yarasa kol&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_kol_tipi&quot; value=&quot;Yarasa Kol&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;yarasa kol&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(3)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;/div&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">kol tipi</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -default "><div class="filter-item__search ">
                  <input type="text" class="filter-item__search-input js-list-search-input" data-key="filterable_kol_tipi" placeholder="Arama">
                </div><div class="filter-item__items"><label class="choice js-filter-choice-label  " data-label="balon kol">
    <input type="checkbox" name="attributes_filterable_kol_tipi" value="Balon Kol" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">balon kol</span>
      <span class="choice__quantity">(25)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="düşük omuz">
    <input type="checkbox" name="attributes_filterable_kol_tipi" value="Düşük Omuz" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">düşük omuz</span>
      <span class="choice__quantity">(1435)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="kısa kol">
    <input type="checkbox" name="attributes_filterable_kol_tipi" value="Kısa Kol" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">kısa kol</span>
      <span class="choice__quantity">(1)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="yarasa kol">
    <input type="checkbox" name="attributes_filterable_kol_tipi" value="Yarasa Kol" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">yarasa kol</span>
      <span class="choice__quantity">(3)</span>
    </div>
  </label></div></div>
          </div>
        </div>
      </pz-expandable><pz-expandable no-semantic="true" title="yaka tipi" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -default &quot;&gt;&lt;div class=&quot;filter-item__search &quot;&gt;
                  &lt;input type=&quot;text&quot; class=&quot;filter-item__search-input js-list-search-input&quot; data-key=&quot;filterable_yaka_tipi&quot; placeholder=&quot;Arama&quot;&gt;
                &lt;/div&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;asimetrik yaka&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_yaka_tipi&quot; value=&quot;Asimetrik Yaka&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;asimetrik yaka&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(2)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;balıkçı yaka&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_yaka_tipi&quot; value=&quot;Balıkçı Yaka&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;balıkçı yaka&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(2)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;bisiklet yaka&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_yaka_tipi&quot; value=&quot;Bisiklet Yaka&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;bisiklet yaka&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1179)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;fermuarlı yaka&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_yaka_tipi&quot; value=&quot;Fermuarlı Yaka&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;fermuarlı yaka&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(30)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;gömlek yaka&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_yaka_tipi&quot; value=&quot;Gömlek Yaka&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;gömlek yaka&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(4)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;hakim yaka&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_yaka_tipi&quot; value=&quot;Hakim Yaka&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;hakim yaka&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(3)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;kapüşonlu&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_yaka_tipi&quot; value=&quot;Kapüşonlu&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;kapüşonlu&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(20)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;polo yaka&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_yaka_tipi&quot; value=&quot;Polo Yaka&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;polo yaka&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(187)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;v yaka&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_yaka_tipi&quot; value=&quot;V Yaka&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;v yaka&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(9)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;/div&gt;&lt;pz-button appearance=&quot;ghost&quot; class=&quot;show-more-trigger js-show-more-trigger pz-button -appearance-ghost&quot;&gt;
      
      
      &lt;span class=&quot;pz-button__text&quot;&gt;Daha Fazla Göster&lt;/span&gt;
    &lt;/pz-button&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">yaka tipi</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -default "><div class="filter-item__search ">
                  <input type="text" class="filter-item__search-input js-list-search-input" data-key="filterable_yaka_tipi" placeholder="Arama">
                </div><div class="filter-item__items"><label class="choice js-filter-choice-label  " data-label="asimetrik yaka">
    <input type="checkbox" name="attributes_filterable_yaka_tipi" value="Asimetrik Yaka" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">asimetrik yaka</span>
      <span class="choice__quantity">(2)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="balıkçı yaka">
    <input type="checkbox" name="attributes_filterable_yaka_tipi" value="Balıkçı Yaka" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">balıkçı yaka</span>
      <span class="choice__quantity">(2)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="bisiklet yaka">
    <input type="checkbox" name="attributes_filterable_yaka_tipi" value="Bisiklet Yaka" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">bisiklet yaka</span>
      <span class="choice__quantity">(1179)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="fermuarlı yaka">
    <input type="checkbox" name="attributes_filterable_yaka_tipi" value="Fermuarlı Yaka" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">fermuarlı yaka</span>
      <span class="choice__quantity">(30)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="gömlek yaka">
    <input type="checkbox" name="attributes_filterable_yaka_tipi" value="Gömlek Yaka" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">gömlek yaka</span>
      <span class="choice__quantity">(4)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="hakim yaka">
    <input type="checkbox" name="attributes_filterable_yaka_tipi" value="Hakim Yaka" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">hakim yaka</span>
      <span class="choice__quantity">(3)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="kapüşonlu">
    <input type="checkbox" name="attributes_filterable_yaka_tipi" value="Kapüşonlu" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">kapüşonlu</span>
      <span class="choice__quantity">(20)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="polo yaka">
    <input type="checkbox" name="attributes_filterable_yaka_tipi" value="Polo Yaka" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">polo yaka</span>
      <span class="choice__quantity">(187)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="v yaka">
    <input type="checkbox" name="attributes_filterable_yaka_tipi" value="V Yaka" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">v yaka</span>
      <span class="choice__quantity">(9)</span>
    </div>
  </label></div><pz-button appearance="ghost" class="show-more-trigger js-show-more-trigger pz-button -appearance-ghost">
      
      
      <span class="pz-button__text">Daha Fazla Göster</span>
    </pz-button></div>
          </div>
        </div>
      </pz-expandable><pz-expandable no-semantic="true" title="lisans karakter" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -default &quot;&gt;&lt;div class=&quot;filter-item__search &quot;&gt;
                  &lt;input type=&quot;text&quot; class=&quot;filter-item__search-input js-list-search-input&quot; data-key=&quot;integration_lisans_karakter&quot; placeholder=&quot;Arama&quot;&gt;
                &lt;/div&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;art&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_lisans_karakter&quot; value=&quot;Art&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;art&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;flinstones&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_lisans_karakter&quot; value=&quot;Flinstones&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;flinstones&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;harvard&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_lisans_karakter&quot; value=&quot;Harvard&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;harvard&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;rick and morty&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_lisans_karakter&quot; value=&quot;Rick And Morty&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;rick and morty&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(3)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;superman&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_lisans_karakter&quot; value=&quot;Superman&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;superman&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(2)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;the matrix&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_integration_lisans_karakter&quot; value=&quot;The Matrix&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;the matrix&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;/div&gt;&lt;pz-button appearance=&quot;ghost&quot; class=&quot;show-more-trigger js-show-more-trigger pz-button -appearance-ghost&quot;&gt;
      
      
      &lt;span class=&quot;pz-button__text&quot;&gt;Daha Fazla Göster&lt;/span&gt;
    &lt;/pz-button&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">lisans karakter</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -default "><div class="filter-item__search ">
                  <input type="text" class="filter-item__search-input js-list-search-input" data-key="integration_lisans_karakter" placeholder="Arama">
                </div><div class="filter-item__items"><label class="choice js-filter-choice-label  " data-label="art">
    <input type="checkbox" name="attributes_integration_lisans_karakter" value="Art" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">art</span>
      <span class="choice__quantity">(1)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="flinstones">
    <input type="checkbox" name="attributes_integration_lisans_karakter" value="Flinstones" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">flinstones</span>
      <span class="choice__quantity">(1)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="harvard">
    <input type="checkbox" name="attributes_integration_lisans_karakter" value="Harvard" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">harvard</span>
      <span class="choice__quantity">(1)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="rick and morty">
    <input type="checkbox" name="attributes_integration_lisans_karakter" value="Rick And Morty" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">rick and morty</span>
      <span class="choice__quantity">(3)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="superman">
    <input type="checkbox" name="attributes_integration_lisans_karakter" value="Superman" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">superman</span>
      <span class="choice__quantity">(2)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="the matrix">
    <input type="checkbox" name="attributes_integration_lisans_karakter" value="The Matrix" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">the matrix</span>
      <span class="choice__quantity">(1)</span>
    </div>
  </label></div><pz-button appearance="ghost" class="show-more-trigger js-show-more-trigger pz-button -appearance-ghost">
      
      
      <span class="pz-button__text">Daha Fazla Göster</span>
    </pz-button></div>
          </div>
        </div>
      </pz-expandable><pz-expandable no-semantic="true" title="bel yüksekliği" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -default &quot;&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;standart bel&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_bel_yuksekligi&quot; value=&quot;Standart Bel&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;standart bel&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;/div&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">bel yüksekliği</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -default "><div class="filter-item__items"><label class="choice js-filter-choice-label  " data-label="standart bel">
    <input type="checkbox" name="attributes_filterable_bel_yuksekligi" value="Standart Bel" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">standart bel</span>
      <span class="choice__quantity">(1)</span>
    </div>
  </label></div></div>
          </div>
        </div>
      </pz-expandable><pz-expandable no-semantic="true" title="fit" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -default &quot;&gt;&lt;div class=&quot;filter-item__search &quot;&gt;
                  &lt;input type=&quot;text&quot; class=&quot;filter-item__search-input js-list-search-input&quot; data-key=&quot;filterable_fit&quot; placeholder=&quot;Arama&quot;&gt;
                &lt;/div&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;bol kalıp&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_fit&quot; value=&quot;Bol Kalıp&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;bol kalıp&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(2)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;dar kalıp&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_fit&quot; value=&quot;Dar Kalıp&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;dar kalıp&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(23)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;oversize&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_fit&quot; value=&quot;Oversize&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;oversize&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(12)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;regular&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_fit&quot; value=&quot;Regular&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;regular&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(812)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;relax&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_fit&quot; value=&quot;Relax&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;relax&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(229)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;slim fit&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_fit&quot; value=&quot;Slim Fit&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;slim fit&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(376)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;standart&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_fit&quot; value=&quot;Standart&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;standart&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(6)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;straight&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_fit&quot; value=&quot;Straight&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;straight&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(30)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;/div&gt;&lt;pz-button appearance=&quot;ghost&quot; class=&quot;show-more-trigger js-show-more-trigger pz-button -appearance-ghost&quot;&gt;
      
      
      &lt;span class=&quot;pz-button__text&quot;&gt;Daha Fazla Göster&lt;/span&gt;
    &lt;/pz-button&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">fit</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -default "><div class="filter-item__search ">
                  <input type="text" class="filter-item__search-input js-list-search-input" data-key="filterable_fit" placeholder="Arama">
                </div><div class="filter-item__items"><label class="choice js-filter-choice-label  " data-label="bol kalıp">
    <input type="checkbox" name="attributes_filterable_fit" value="Bol Kalıp" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">bol kalıp</span>
      <span class="choice__quantity">(2)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="dar kalıp">
    <input type="checkbox" name="attributes_filterable_fit" value="Dar Kalıp" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">dar kalıp</span>
      <span class="choice__quantity">(23)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="oversize">
    <input type="checkbox" name="attributes_filterable_fit" value="Oversize" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">oversize</span>
      <span class="choice__quantity">(12)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="regular">
    <input type="checkbox" name="attributes_filterable_fit" value="Regular" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">regular</span>
      <span class="choice__quantity">(812)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="relax">
    <input type="checkbox" name="attributes_filterable_fit" value="Relax" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">relax</span>
      <span class="choice__quantity">(229)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="slim fit">
    <input type="checkbox" name="attributes_filterable_fit" value="Slim Fit" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">slim fit</span>
      <span class="choice__quantity">(376)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="standart">
    <input type="checkbox" name="attributes_filterable_fit" value="Standart" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">standart</span>
      <span class="choice__quantity">(6)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="straight">
    <input type="checkbox" name="attributes_filterable_fit" value="Straight" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">straight</span>
      <span class="choice__quantity">(30)</span>
    </div>
  </label></div><pz-button appearance="ghost" class="show-more-trigger js-show-more-trigger pz-button -appearance-ghost">
      
      
      <span class="pz-button__text">Daha Fazla Göster</span>
    </pz-button></div>
          </div>
        </div>
      </pz-expandable><pz-expandable no-semantic="true" title="kol boyu" data-initial-h-t-m-l="
            &lt;div class=&quot;js-filter-item filter-item -default &quot;&gt;&lt;div class=&quot;filter-item__search &quot;&gt;
                  &lt;input type=&quot;text&quot; class=&quot;filter-item__search-input js-list-search-input&quot; data-key=&quot;filterable_kol_boyu&quot; placeholder=&quot;Arama&quot;&gt;
                &lt;/div&gt;&lt;div class=&quot;filter-item__items&quot;&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;kısa kol&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_kol_boyu&quot; value=&quot;Kısa Kol&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;kısa kol&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1449)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;kolsuz&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_kol_boyu&quot; value=&quot;Kolsuz&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;kolsuz&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(1)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;uzun kol&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_kol_boyu&quot; value=&quot;Uzun Kol&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;uzun kol&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(7)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;label class=&quot;choice js-filter-choice-label  &quot; data-label=&quot;yarım kol&quot;&gt;
    &lt;input type=&quot;checkbox&quot; name=&quot;attributes_filterable_kol_boyu&quot; value=&quot;Yarım Kol&quot; class=&quot;js-filter-choice&quot;&gt;
    &lt;div class=&quot;choice__texts&quot;&gt;
      &lt;span class=&quot;choice__label&quot;&gt;yarım kol&lt;/span&gt;
      &lt;span class=&quot;choice__quantity&quot;&gt;(7)&lt;/span&gt;
    &lt;/div&gt;
  &lt;/label&gt;&lt;/div&gt;&lt;/div&gt;
          " class="pz-expandable -enabled">
        <header class="pz-expandable__header js-pz-expandable-header">
          
          <div class="pz-expandable__title-wrapper">
          <div class="title">kol boyu</div>
            
          </div>
          <i class="toggle-icon pz-icon-chevron-down"></i>
        </header>
        <div class="pz-expandable__body">
          <div class="content">
            <div class="js-filter-item filter-item -default "><div class="filter-item__search ">
                  <input type="text" class="filter-item__search-input js-list-search-input" data-key="filterable_kol_boyu" placeholder="Arama">
                </div><div class="filter-item__items"><label class="choice js-filter-choice-label  " data-label="kısa kol">
    <input type="checkbox" name="attributes_filterable_kol_boyu" value="Kısa Kol" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">kısa kol</span>
      <span class="choice__quantity">(1449)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="kolsuz">
    <input type="checkbox" name="attributes_filterable_kol_boyu" value="Kolsuz" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">kolsuz</span>
      <span class="choice__quantity">(1)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="uzun kol">
    <input type="checkbox" name="attributes_filterable_kol_boyu" value="Uzun Kol" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">uzun kol</span>
      <span class="choice__quantity">(7)</span>
    </div>
  </label><label class="choice js-filter-choice-label  " data-label="yarım kol">
    <input type="checkbox" name="attributes_filterable_kol_boyu" value="Yarım Kol" class="js-filter-choice">
    <div class="choice__texts">
      <span class="choice__label">yarım kol</span>
      <span class="choice__quantity">(7)</span>
    </div>
  </label></div></div>
          </div>
        </div>
      </pz-expandable></div>
  </div>

  <div class="list__sidebar-footer">
    <div class="list__sidebar-footer-info" hidden="">
      <span>
        1499 Ürün
      </span></div>

    <pz-button class="list__sidebar-button js-close-mobile-filtering -w-full pz-button -appearance-filled -size-2xl" type="submit" size="2xl" w-full="">
      
      
      <span class="pz-button__text">1499 ÜRÜNÜ GÖSTER</span>
    </pz-button>

    <pz-button class="list__sidebar-button js-list-apply-filters -w-full pz-button -appearance-filled -size-2xl" type="submit" size="2xl" w-full="" hidden="">
      
      
      <span class="pz-button__text">UYGULA</span>
    </pz-button>
  </div>
</div><div class="list__content"><div class="js-list-product list__products">

            
              
                
              
            


  





  



<div data-layout="2" data-index="1" class="js-product-wrapper product-item  " data-sku="8684630729450" data-pk="1406744" data-url="/kisa-kollu-pamuklu-bisiklet-yaka-arkasi-baskili-tisort-ekru-4015916-1/" data-price="499.99" data-key="integration_color_desc" data-value="057" data-render="true" data-fetch="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684630729450",
      "name": "Kısa Kollu Pamuklu Bisiklet Yaka Arkası Baskılı Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  499.99 ,
      "unit_sale_price":  499.99 ,
      "url": "https://www.koton.com/kisa-kollu-pamuklu-bisiklet-yaka-arkasi-baskili-tisort-ekru-4015916-1/",
      "stock": 0,
      "color": "BEJ",
      "size": "L",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/05/22/3087141/15efd11a-cf4e-4871-bc15-1802ee0f7536.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img width="80" height="20" alt="Arkası Baskılı" src="https://ktnimg2.mncdn.com/cms/2025/03/24/0e617ea4-13b5-46d6-8949-dd44a7d11ee2.jpg"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal -intersected -mounted" pagination="" data-render="true" data-current-index="1">
      <div class="pz-carousel__container splide splide--slide splide--ltr splide--draggable is-active is-overflow is-initialized" id="splide01" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide01-track" style="padding-left: 0rem; padding-right: 0rem;" aria-live="polite" aria-atomic="true" aria-busy="false">
          <ul class="pz-carousel__list splide__list" id="splide01-list" role="presentation" style="transform: translateX(-397.5px);"><li class="pz-carousel__slide splide__slide is-prev" id="splide01-slide01" role="tabpanel" aria-roledescription="slide" aria-label="1 of 2" style="margin-right: 0rem; width: calc(100% + 0rem);" aria-hidden="true"><a href="/kisa-kollu-pamuklu-bisiklet-yaka-arkasi-baskili-tisort-ekru-4015916-1/" class="product-link js-product-link" aria-label="Go to Product" target="_blank" tabindex="-1"> 
    <pz-image-placeholder class="pz-image-placeholder block">
      <picture>
        <source media="(max-width: 768px)" srcset="https://ktnimg2.mncdn.com/products/2025/05/22/3087141/15efd11a-cf4e-4871-bc15-1802ee0f7536_size354x464.jpg">
        <img width="708" height="930" src="https://ktnimg2.mncdn.com/products/2025/05/22/3087141/15efd11a-cf4e-4871-bc15-1802ee0f7536_size708x930.jpg" alt=" Kısa Kollu Pamuklu Bisiklet Yaka Arkası Baskılı Tişört" class="0">
      </picture>
    </pz-image-placeholder>
  </a></li><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide01-slide02" role="tabpanel" aria-roledescription="slide" aria-label="2 of 2" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/kisa-kollu-pamuklu-bisiklet-yaka-arkasi-baskili-tisort-ekru-4015916-1/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder slider="" class="pz-image-placeholder block relative -intersected">
      <picture>
        <source media="(max-width: 768px)" srcset="https://ktnimg2.mncdn.com/products/2025/05/22/3087141/dbcf3b86-2758-4642-bc66-aefa7dbf8ea7_size354x464.jpg">
        <img width="708" height="930" alt=" Kısa Kollu Pamuklu Bisiklet Yaka Arkası Baskılı Tişört" src="https://ktnimg2.mncdn.com/products/2025/05/22/3087141/dbcf3b86-2758-4642-bc66-aefa7dbf8ea7_size708x930.jpg">
      </picture>
    </pz-image-placeholder>
  </a></li></ul>
        </div>
      <ul class="splide__pagination splide__pagination--ltr" role="tablist" aria-label="Select a slide to show"><li role="presentation"><button class="splide__pagination__page" type="button" role="tab" aria-controls="splide01-slide01" aria-label="Go to slide 1" tabindex="-1"></button></li><li role="presentation"><button class="splide__pagination__page is-active" type="button" role="tab" aria-controls="splide01-slide02" aria-label="Go to slide 2" aria-selected="true"></button></li></ul></div>
    </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Kısa Kollu Pamuklu Bisiklet Yaka Arkası Baskılı Tişört",
        "item_id": "8684630729450",
        "price":  499.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "BEJ|L",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 0 ,
        "quantity":1,
        "base_code": "5SAM10176HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1406744">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="057" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Kısa Kollu Pamuklu Bisiklet Yaka Arkası Baskılı Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action -ready">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
      <div class="variant">
        <div class="variant__label">
          Beden Ekle
        </div>
        <div class="variant__options">
          
              <div class="variant__option js-variant-option -out-of-stock" data-key="integration_size_id" data-value="S" data-product="1406743">
                
                <pz-button class="js-product-stock-alert pz-product-alert-button -faded -reversed pz-button -appearance-filled">
      
      
      <span class="pz-button__text">S</span>
    </pz-button>
              </div>
            
              <div class="variant__option js-variant-option -out-of-stock" data-key="integration_size_id" data-value="M" data-product="1406742">
                
                <pz-button class="js-product-stock-alert pz-product-alert-button -faded -reversed pz-button -appearance-filled">
      
      
      <span class="pz-button__text">M</span>
    </pz-button>
              </div>
            
              <div class="variant__option js-variant-option -out-of-stock" data-key="integration_size_id" data-value="L" data-product="1406744">
                
                <pz-button class="js-product-stock-alert pz-product-alert-button -faded -reversed pz-button -appearance-filled">
      
      
      <span class="pz-button__text">L</span>
    </pz-button>
              </div>
            
              <div class="variant__option js-variant-option -out-of-stock" data-key="integration_size_id" data-value="XL" data-product="1406741">
                
                <pz-button class="js-product-stock-alert pz-product-alert-button -faded -reversed pz-button -appearance-filled">
      
      
      <span class="pz-button__text">XL</span>
    </pz-button>
              </div>
            
              <div class="variant__option js-variant-option" data-key="integration_size_id" data-value="XXL" data-product="1406851">
                XXL
              </div>
            
        </div>
      </div>
    
        <div class="action__error js-action-error"></div>
    </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/kisa-kollu-pamuklu-bisiklet-yaka-arkasi-baskili-tisort-ekru-4015916-1/" target="_blank" class="js-product-link product-link"> Kısa Kollu Pamuklu Bisiklet Yaka Arkası Baskılı Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10176HK" link-url="/kisa-kollu-pamuklu-bisiklet-yaka-arkasi-baskili-tisort-ekru-4015916-1/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">499,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal -intersected -mounted">
      <div class="pz-carousel__container splide splide--slide splide--ltr splide--draggable is-active is-initialized" id="splide07" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide07-track" style="padding-left: 0rem; padding-right: 0rem;" aria-live="polite" aria-atomic="true">
          <ul class="pz-carousel__list splide__list" id="splide07-list" role="presentation" style="transform: translateX(0px);"><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide07-slide01" role="group" aria-roledescription="slide" aria-label="1 of 1" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/kisa-kollu-pamuklu-bisiklet-yaka-arkasi-baskili-tisort-ekru-4015916-1/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/05/22/3087141/15efd11a-cf4e-4871-bc15-1802ee0f7536_size680x892_cropCenter.jpg" aria-label="Kısa Kollu Pamuklu Bisiklet Yaka Arkası Baskılı Tişört 057 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Kısa Kollu Pamuklu Bisiklet Yaka Arkası Baskılı Tişört-057" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/05/22/3087141/3ddf64ad-81d7-462d-99b2-07afa3875d76_size24x24_cropCenter.jpg">
                    </div>
                  </a></li></ul>
        </div>
      </div>
    </pz-carousel>
          </div><div class="product-item__info-campaign"></div>
          <pz-mobile-quickshop url="/kisa-kollu-pamuklu-bisiklet-yaka-arkasi-baskili-tisort-ekru-4015916-1/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="2" class="js-product-wrapper product-item  " data-sku="8684630729290" data-pk="1405523" data-url="/arkasi-baskili-kisa-kollu-pamuklu-bisiklet-yaka-tisort-beyaz-4015914/" data-price="499.99" data-key="integration_color_desc" data-value="000" data-render="true" data-fetch="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684630729290",
      "name": "Arkası Baskılı Kısa Kollu Pamuklu Bisiklet Yaka Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  499.99 ,
      "unit_sale_price":  499.99 ,
      "url": "https://www.koton.com/arkasi-baskili-kisa-kollu-pamuklu-bisiklet-yaka-tisort-beyaz-4015914/",
      "stock": 7,
      "color": "BEYAZ",
      "size": "S",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/06/27/3065791/48ca4588-453d-40f1-99e6-73dbb8df03ac.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img width="80" height="20" alt="Arkası Baskılı" src="https://ktnimg2.mncdn.com/cms/2025/03/24/0e617ea4-13b5-46d6-8949-dd44a7d11ee2.jpg"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal -intersected -mounted" pagination="" data-render="true" data-current-index="1">
      <div class="pz-carousel__container splide splide--slide splide--ltr splide--draggable is-active is-overflow is-initialized" id="splide02" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide02-track" style="padding-left: 0rem; padding-right: 0rem;" aria-live="polite" aria-atomic="true" aria-busy="false">
          <ul class="pz-carousel__list splide__list" id="splide02-list" role="presentation" style="transform: translateX(-397.5px);"><li class="pz-carousel__slide splide__slide is-prev" id="splide02-slide01" role="tabpanel" aria-roledescription="slide" aria-label="1 of 2" style="margin-right: 0rem; width: calc(100% + 0rem);" aria-hidden="true"><a href="/arkasi-baskili-kisa-kollu-pamuklu-bisiklet-yaka-tisort-beyaz-4015914/" class="product-link js-product-link" aria-label="Go to Product" target="_blank" tabindex="-1"> 
    <pz-image-placeholder class="pz-image-placeholder block">
      <picture>
        <source media="(max-width: 768px)" srcset="https://ktnimg2.mncdn.com/products/2025/06/27/3065791/48ca4588-453d-40f1-99e6-73dbb8df03ac_size354x464.jpg">
        <img width="708" height="930" src="https://ktnimg2.mncdn.com/products/2025/06/27/3065791/48ca4588-453d-40f1-99e6-73dbb8df03ac_size708x930.jpg" alt=" Arkası Baskılı Kısa Kollu Pamuklu Bisiklet Yaka Tişört" class="0">
      </picture>
    </pz-image-placeholder>
  </a></li><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide02-slide02" role="tabpanel" aria-roledescription="slide" aria-label="2 of 2" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/arkasi-baskili-kisa-kollu-pamuklu-bisiklet-yaka-tisort-beyaz-4015914/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder slider="" class="pz-image-placeholder block relative -intersected">
      <picture>
        <source media="(max-width: 768px)" srcset="https://ktnimg2.mncdn.com/products/2025/06/27/3065791/290a7e89-0dc9-41a6-a158-465aeb6ba61d_size354x464.jpg">
        <img width="708" height="930" alt=" Arkası Baskılı Kısa Kollu Pamuklu Bisiklet Yaka Tişört" src="https://ktnimg2.mncdn.com/products/2025/06/27/3065791/290a7e89-0dc9-41a6-a158-465aeb6ba61d_size708x930.jpg">
      </picture>
    </pz-image-placeholder>
  </a></li></ul>
        </div>
      <ul class="splide__pagination splide__pagination--ltr" role="tablist" aria-label="Select a slide to show"><li role="presentation"><button class="splide__pagination__page" type="button" role="tab" aria-controls="splide02-slide01" aria-label="Go to slide 1" tabindex="-1"></button></li><li role="presentation"><button class="splide__pagination__page is-active" type="button" role="tab" aria-controls="splide02-slide02" aria-label="Go to slide 2" aria-selected="true"></button></li></ul></div>
    </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Arkası Baskılı Kısa Kollu Pamuklu Bisiklet Yaka Tişört",
        "item_id": "8684630729290",
        "price":  499.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "BEYAZ|S",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 1 ,
        "quantity":1,
        "base_code": "5SAM10172HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1405523">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="000" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Arkası Baskılı Kısa Kollu Pamuklu Bisiklet Yaka Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action -ready">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
      <div class="variant">
        <div class="variant__label">
          Beden Ekle
        </div>
        <div class="variant__options">
          
              <div class="variant__option js-variant-option" data-key="integration_size_id" data-value="S" data-product="1405523">
                S
              </div>
            
              <div class="variant__option js-variant-option -out-of-stock" data-key="integration_size_id" data-value="M" data-product="1405866">
                
                <pz-button class="js-product-stock-alert pz-product-alert-button -faded -reversed pz-button -appearance-filled">
      
      
      <span class="pz-button__text">M</span>
    </pz-button>
              </div>
            
              <div class="variant__option js-variant-option -out-of-stock" data-key="integration_size_id" data-value="L" data-product="1405867">
                
                <pz-button class="js-product-stock-alert pz-product-alert-button -faded -reversed pz-button -appearance-filled">
      
      
      <span class="pz-button__text">L</span>
    </pz-button>
              </div>
            
              <div class="variant__option js-variant-option -out-of-stock" data-key="integration_size_id" data-value="XL" data-product="1405524">
                
                <pz-button class="js-product-stock-alert pz-product-alert-button -faded -reversed pz-button -appearance-filled">
      
      
      <span class="pz-button__text">XL</span>
    </pz-button>
              </div>
            
              <div class="variant__option js-variant-option" data-key="integration_size_id" data-value="XXL" data-product="1406511">
                XXL
              </div>
            
        </div>
      </div>
    
        <div class="action__error js-action-error"></div>
    </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/arkasi-baskili-kisa-kollu-pamuklu-bisiklet-yaka-tisort-beyaz-4015914/" target="_blank" class="js-product-link product-link"> Arkası Baskılı Kısa Kollu Pamuklu Bisiklet Yaka Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10172HK" link-url="/arkasi-baskili-kisa-kollu-pamuklu-bisiklet-yaka-tisort-beyaz-4015914/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">499,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal -intersected -mounted">
      <div class="pz-carousel__container splide splide--slide splide--ltr splide--draggable is-active is-initialized" id="splide09" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide09-track" style="padding-left: 0rem; padding-right: 0rem;" aria-live="polite" aria-atomic="true">
          <ul class="pz-carousel__list splide__list" id="splide09-list" role="presentation" style="transform: translateX(0px);"><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide09-slide01" role="group" aria-roledescription="slide" aria-label="1 of 1" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/arkasi-baskili-kisa-kollu-pamuklu-bisiklet-yaka-tisort-beyaz-4015914/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/06/27/3065791/48ca4588-453d-40f1-99e6-73dbb8df03ac_size680x892_cropCenter.jpg" aria-label="Arkası Baskılı Kısa Kollu Pamuklu Bisiklet Yaka Tişört 000 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Arkası Baskılı Kısa Kollu Pamuklu Bisiklet Yaka Tişört-000" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/03/11/3065787/4b40ac41-fa05-4b1e-a063-4ba9555e018a_size24x24_cropCenter.jpg">
                    </div>
                  </a></li></ul>
        </div>
      </div>
    </pz-carousel>
          </div><div class="product-item__info-campaign"></div>
          <pz-mobile-quickshop url="/arkasi-baskili-kisa-kollu-pamuklu-bisiklet-yaka-tisort-beyaz-4015914/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="3" class="js-product-wrapper product-item  " data-sku="8684756077411" data-pk="1377973" data-url="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-ekru-4044178-3/" data-price="749.99" data-key="integration_color_desc" data-value="010" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684756077411",
      "name": "Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS BSC"],
      "currency": "TRY",
      "unit_price":  749.99 ,
      "unit_sale_price":  749.99 ,
      "url": "https://www.koton.com/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-ekru-4044178-3/",
      "stock": 17,
      "color": "EKRU",
      "size": "XL",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/03/28/3070101/9b05b999-4301-4537-bd0a-1e1bb98e9385.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img width="80" height="20" alt="Yeni Sezon" src="https://ktnimg2.mncdn.com/cms/2023/12/07/a90a49e7-1d92-4293-a6f1-ce6cf1a00ce8.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal -intersected -mounted" pagination="" data-render="true" data-current-index="1">
      <div class="pz-carousel__container splide splide--slide splide--ltr splide--draggable is-active is-overflow is-initialized" id="splide05" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide05-track" style="padding-left: 0rem; padding-right: 0rem;" aria-live="polite" aria-atomic="true" aria-busy="false">
          <ul class="pz-carousel__list splide__list" id="splide05-list" role="presentation" style="transform: translateX(-397.5px);"><li class="pz-carousel__slide splide__slide is-prev" id="splide05-slide01" role="tabpanel" aria-roledescription="slide" aria-label="1 of 2" style="margin-right: 0rem; width: calc(100% + 0rem);" aria-hidden="true"><a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-ekru-4044178-3/" class="product-link js-product-link" aria-label="Go to Product" target="_blank" tabindex="-1"> 
    <pz-image-placeholder class="pz-image-placeholder block">
      <picture>
        <source media="(max-width: 768px)" srcset="https://ktnimg2.mncdn.com/products/2025/03/28/3070101/9b05b999-4301-4537-bd0a-1e1bb98e9385_size354x464.jpg">
        <img width="708" height="930" src="https://ktnimg2.mncdn.com/products/2025/03/28/3070101/9b05b999-4301-4537-bd0a-1e1bb98e9385_size708x930.jpg" alt=" Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört" class="0">
      </picture>
    </pz-image-placeholder>
  </a></li><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide05-slide02" role="tabpanel" aria-roledescription="slide" aria-label="2 of 2" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-ekru-4044178-3/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder slider="" class="pz-image-placeholder block relative -intersected">
      <picture>
        <source media="(max-width: 768px)" srcset="https://ktnimg2.mncdn.com/products/2025/03/28/3070109/71e216c7-1671-4298-9f98-8f437fcd60ff_size354x464.jpg">
        <img width="708" height="930" alt=" Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört" src="https://ktnimg2.mncdn.com/products/2025/03/28/3070109/71e216c7-1671-4298-9f98-8f437fcd60ff_size708x930.jpg">
      </picture>
    </pz-image-placeholder>
  </a></li></ul>
        </div>
      <ul class="splide__pagination splide__pagination--ltr" role="tablist" aria-label="Select a slide to show"><li role="presentation"><button class="splide__pagination__page" type="button" role="tab" aria-controls="splide05-slide01" aria-label="Go to slide 1" tabindex="-1"></button></li><li role="presentation"><button class="splide__pagination__page is-active" type="button" role="tab" aria-controls="splide05-slide02" aria-label="Go to slide 2" aria-selected="true"></button></li></ul></div>
    </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört",
        "item_id": "8684756077411",
        "price":  749.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS BSC",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "EKRU|XL",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 2 ,
        "quantity":1,
        "base_code": "5SAM10371HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1377973">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="010" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-ekru-4044178-3/" target="_blank" class="js-product-link product-link"> Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10371HK" link-url="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-ekru-4044178-3/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">749,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button="">+(3) Renk</div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal -intersected -mounted">
      <div class="pz-carousel__container splide splide--slide splide--ltr splide--draggable is-active is-initialized" id="splide10" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide10-track" style="padding-left: 0rem; padding-right: 0rem;" aria-live="polite" aria-atomic="true">
          <ul class="pz-carousel__list splide__list" id="splide10-list" role="presentation" style="transform: translateX(0px);"><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide10-slide01" role="group" aria-roledescription="slide" aria-label="1 of 4" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-ekru-4044178-3/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/03/28/3070101/9b05b999-4301-4537-bd0a-1e1bb98e9385_size680x892_cropCenter.jpg" aria-label="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört 010 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört-010" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/03/28/3070109/bd7851c1-1314-43a3-9cbe-1ff3c458e852_size24x24_cropCenter.jpg">
                    </div>
                  </a></li><li class="pz-carousel__slide splide__slide is-visible is-next" id="splide10-slide02" role="group" aria-roledescription="slide" aria-label="2 of 4" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-gri-4044179-1/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/04/02/3070145/aef88e67-6de2-4dc4-9924-4dee89657cdd_size680x892_cropCenter.jpg" aria-label="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört 031 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört-031" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/04/02/3070145/dbdd5319-75a3-4d4e-a5d9-7f289f57303e_size24x24_cropCenter.jpg">
                    </div>
                  </a></li><li class="pz-carousel__slide splide__slide is-visible" id="splide10-slide03" role="group" aria-roledescription="slide" aria-label="3 of 4" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-lacivert-4044753-1/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/05/08/3070440/228dcadd-f587-4781-986e-f14432d696d2_size680x892_cropCenter.jpg" aria-label="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört 725 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört-725" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/03/20/3070440/6617c2e2-9dcd-4e6d-a3ad-810530049f0f_size24x24_cropCenter.jpg">
                    </div>
                  </a></li><li class="pz-carousel__slide splide__slide is-visible" id="splide10-slide04" role="group" aria-roledescription="slide" aria-label="4 of 4" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-yesil-4044754-2/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/03/28/3070138/2467be1a-bb1f-4abd-b88d-8be487f0e9cd_size680x892_cropCenter.jpg" aria-label="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört 786 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört-786" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/03/28/3070138/5d00e4aa-1e8c-47e5-b313-91af41df30af_size24x24_cropCenter.jpg">
                    </div>
                  </a></li></ul>
        </div>
      </div>
    </pz-carousel>
          </div><div class="product-item__info-campaign"><span>1.000 TL ve ÜZERİNE %20 + KTN25 KODU İLE EK %25 İNDİRİM</span></div>
          <pz-mobile-quickshop url="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-ekru-4044178-3/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="4" class="js-product-wrapper product-item  " data-sku="8684631738253" data-pk="1353552" data-url="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-lacivert-4030313/" data-price="399.99" data-key="integration_color_desc" data-value="725" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684631738253",
      "name": "Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS BSC"],
      "currency": "TRY",
      "unit_price":  399.99 ,
      "unit_sale_price":  399.99 ,
      "url": "https://www.koton.com/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-lacivert-4030313/",
      "stock": 0,
      "color": "LACİVERT",
      "size": "L",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/01/07/3039517/5739d497-4bea-4027-98fe-b6da8427cb6e.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img width="80" height="20" alt="Çok Satan" src="https://ktnimg2.mncdn.com/cms/2023/12/07/4fc523ee-7f99-46fd-a081-fd2fd46f99fd.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal -intersected -mounted" pagination="" data-render="true" data-current-index="1">
      <div class="pz-carousel__container splide splide--slide splide--ltr splide--draggable is-active is-overflow is-initialized" id="splide06" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide06-track" style="padding-left: 0rem; padding-right: 0rem;" aria-live="polite" aria-atomic="true" aria-busy="false">
          <ul class="pz-carousel__list splide__list" id="splide06-list" role="presentation" style="transform: translateX(-397.5px);"><li class="pz-carousel__slide splide__slide is-prev" id="splide06-slide01" role="tabpanel" aria-roledescription="slide" aria-label="1 of 2" style="margin-right: 0rem; width: calc(100% + 0rem);" aria-hidden="true"><a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-lacivert-4030313/" class="product-link js-product-link" aria-label="Go to Product" target="_blank" tabindex="-1"> 
    <pz-image-placeholder class="pz-image-placeholder block">
      <picture>
        <source media="(max-width: 768px)" srcset="https://ktnimg2.mncdn.com/products/2025/01/07/3039517/5739d497-4bea-4027-98fe-b6da8427cb6e_size354x464.jpg">
        <img width="708" height="930" src="https://ktnimg2.mncdn.com/products/2025/01/07/3039517/5739d497-4bea-4027-98fe-b6da8427cb6e_size708x930.jpg" alt=" Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört" class="0">
      </picture>
    </pz-image-placeholder>
  </a></li><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide06-slide02" role="tabpanel" aria-roledescription="slide" aria-label="2 of 2" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-lacivert-4030313/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder slider="" class="pz-image-placeholder block relative -intersected">
      <picture>
        <source media="(max-width: 768px)" srcset="https://ktnimg2.mncdn.com/products/2025/01/07/3039517/983be823-1102-42f8-a20c-74cf3de3628d_size354x464.jpg">
        <img width="708" height="930" alt=" Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört" src="https://ktnimg2.mncdn.com/products/2025/01/07/3039517/983be823-1102-42f8-a20c-74cf3de3628d_size708x930.jpg">
      </picture>
    </pz-image-placeholder>
  </a></li></ul>
        </div>
      <ul class="splide__pagination splide__pagination--ltr" role="tablist" aria-label="Select a slide to show"><li role="presentation"><button class="splide__pagination__page" type="button" role="tab" aria-controls="splide06-slide01" aria-label="Go to slide 1" tabindex="-1"></button></li><li role="presentation"><button class="splide__pagination__page is-active" type="button" role="tab" aria-controls="splide06-slide02" aria-label="Go to slide 2" aria-selected="true"></button></li></ul></div>
    </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört",
        "item_id": "8684631738253",
        "price":  399.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS BSC",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "LACİVERT|L",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 3 ,
        "quantity":1,
        "base_code": "5SAM10344HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1353552">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="725" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-lacivert-4030313/" target="_blank" class="js-product-link product-link"> Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10344HK" link-url="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-lacivert-4030313/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">399,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button="">+(3) Renk</div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal -intersected -mounted">
      <div class="pz-carousel__container splide splide--slide splide--ltr splide--draggable is-active is-initialized" id="splide08" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide08-track" style="padding-left: 0rem; padding-right: 0rem;" aria-live="polite" aria-atomic="true">
          <ul class="pz-carousel__list splide__list" id="splide08-list" role="presentation" style="transform: translateX(0px);"><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide08-slide01" role="group" aria-roledescription="slide" aria-label="1 of 4" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-beyaz-4030311-1/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/01/14/3043571/699c0b32-bd3a-4606-b9bb-24676fb5af72_size680x892_cropCenter.jpg" aria-label="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört 000 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört-000" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/01/14/3043571/68a66721-816b-496e-8331-0fcd0304ae86_size24x24_cropCenter.jpg">
                    </div>
                  </a></li><li class="pz-carousel__slide splide__slide is-visible is-next" id="splide08-slide02" role="group" aria-roledescription="slide" aria-label="2 of 4" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-gri-4030312/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/01/17/3044864/dc261084-87ff-470c-954e-30156260d3d2_size680x892_cropCenter.jpg" aria-label="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört 031 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört-031" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/01/17/3044864/ce34a122-7122-4e35-978c-a62efae20364_size24x24_cropCenter.jpg">
                    </div>
                  </a></li><li class="pz-carousel__slide splide__slide is-visible" id="splide08-slide03" role="group" aria-roledescription="slide" aria-label="3 of 4" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-lacivert-4030313/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/01/07/3039517/5739d497-4bea-4027-98fe-b6da8427cb6e_size680x892_cropCenter.jpg" aria-label="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört 725 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört-725" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/01/07/3039517/ac38d5cc-b80c-4729-9299-46a9899d2f2e_size24x24_cropCenter.jpg">
                    </div>
                  </a></li><li class="pz-carousel__slide splide__slide is-visible" id="splide08-slide04" role="group" aria-roledescription="slide" aria-label="4 of 4" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-yesil-4030314-2/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/02/25/3060283/1a82294a-a268-44ce-b0dd-61c900915d50_size680x892_cropCenter.jpg" aria-label="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört 786 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört-786" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/02/25/3060283/e958445c-f55b-4f7f-a7ab-815ffc324366_size24x24_cropCenter.jpg">
                    </div>
                  </a></li></ul>
        </div>
      </div>
    </pz-carousel>
          </div><div class="product-item__info-campaign"><span>1.000 TL ve ÜZERİNE %20 + KTN25 KODU İLE EK %25 İNDİRİM</span></div>
          <pz-mobile-quickshop url="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-lacivert-4030313/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="5" class="js-product-wrapper product-item  " data-sku="8684631738109" data-pk="1363520" data-url="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-beyaz-4030311-1/" data-price="349.99" data-key="integration_color_desc" data-value="000" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684631738109",
      "name": "Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS BSC"],
      "currency": "TRY",
      "unit_price":  349.99 ,
      "unit_sale_price":  349.99 ,
      "url": "https://www.koton.com/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-beyaz-4030311-1/",
      "stock": 0,
      "color": "BEYAZ",
      "size": "XL",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/01/14/3043571/699c0b32-bd3a-4606-b9bb-24676fb5af72.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Yeni Sezon" src="https://ktnimg2.mncdn.com/cms/2023/12/07/a90a49e7-1d92-4293-a6f1-ce6cf1a00ce8.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal -intersected -mounted" pagination="" data-render="true">
      <div class="pz-carousel__container splide splide--slide splide--ltr splide--draggable is-active is-overflow is-initialized" id="splide13" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide13-track" style="padding-left: 0rem; padding-right: 0rem;" aria-live="polite" aria-atomic="true">
          <ul class="pz-carousel__list splide__list" id="splide13-list" role="presentation" style="transform: translateX(0px);"><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide13-slide01" role="tabpanel" aria-roledescription="slide" aria-label="1 of 2" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-beyaz-4030311-1/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder slider="" class="pz-image-placeholder block relative -intersected">
      <picture>
        <source media="(max-width: 768px)" srcset="https://ktnimg2.mncdn.com/products/2025/01/14/3043571/699c0b32-bd3a-4606-b9bb-24676fb5af72_size354x464.jpg">
        <img width="708" height="930" alt=" Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört" src="https://ktnimg2.mncdn.com/products/2025/01/14/3043571/699c0b32-bd3a-4606-b9bb-24676fb5af72_size708x930.jpg">
      </picture>
    </pz-image-placeholder>
  </a></li><li class="pz-carousel__slide splide__slide is-next" id="splide13-slide02" role="tabpanel" aria-roledescription="slide" aria-label="2 of 2" aria-hidden="true" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-beyaz-4030311-1/" class="product-link js-product-link" aria-label="Go to Product" target="_blank" tabindex="-1"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative" style="aspect-ratio: 1 / 1;">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/01/14/3043571/c7d954ca-af2c-429f-911d-baf79c200316_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/01/14/3043571/c7d954ca-af2c-429f-911d-baf79c200316_size708x930.jpg" alt=" Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört">
      </picture>
    </pz-image-placeholder>
  </a></li></ul>
        </div>
      <ul class="splide__pagination splide__pagination--ltr" role="tablist" aria-label="Select a slide to show"><li role="presentation"><button class="splide__pagination__page is-active" type="button" role="tab" aria-controls="splide13-slide01" aria-label="Go to slide 1" aria-selected="true"></button></li><li role="presentation"><button class="splide__pagination__page" type="button" role="tab" aria-controls="splide13-slide02" aria-label="Go to slide 2" tabindex="-1"></button></li></ul></div>
    </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört",
        "item_id": "8684631738109",
        "price":  349.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS BSC",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "BEYAZ|XL",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 4 ,
        "quantity":1,
        "base_code": "5SAM10344HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1363520">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="000" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-beyaz-4030311-1/" target="_blank" class="js-product-link product-link"> Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10344HK" link-url="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-beyaz-4030311-1/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">349,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button="">+(3) Renk</div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-beyaz-4030311-1/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/01/14/3043571/699c0b32-bd3a-4606-b9bb-24676fb5af72_size680x892_cropCenter.jpg" aria-label="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört 000 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört-000" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/01/14/3043571/68a66721-816b-496e-8331-0fcd0304ae86_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-gri-4030312/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/01/17/3044864/dc261084-87ff-470c-954e-30156260d3d2_size680x892_cropCenter.jpg" aria-label="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört 031 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört-031" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/01/17/3044864/ce34a122-7122-4e35-978c-a62efae20364_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-lacivert-4030313/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/01/07/3039517/5739d497-4bea-4027-98fe-b6da8427cb6e_size680x892_cropCenter.jpg" aria-label="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört 725 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört-725" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/01/07/3039517/ac38d5cc-b80c-4729-9299-46a9899d2f2e_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-yesil-4030314-2/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/02/25/3060283/1a82294a-a268-44ce-b0dd-61c900915d50_size680x892_cropCenter.jpg" aria-label="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört 786 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört-786" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/02/25/3060283/e958445c-f55b-4f7f-a7ab-815ffc324366_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"></div>
          <pz-mobile-quickshop url="/bisiklet-yaka-kisa-kollu-pamuklu-biyeli-slim-fit-tisort-beyaz-4030311-1/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="6" class="js-product-wrapper product-item  " data-sku="8684632253199" data-pk="1367862" data-url="/pamuklu-regular-fit-kisa-kollu-bisiklet-yaka-basic-5-li-erkek-tisort-seti-mavi-4038602-3/" data-price="1299.99" data-key="integration_color_desc" data-value="MIX" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684632253199",
      "name": "Pamuklu Regular Fit Kısa Kollu Bisiklet Yaka Basic 5'li Erkek Tişört Seti",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS BSC"],
      "currency": "TRY",
      "unit_price":  1299.99 ,
      "unit_sale_price":  1299.99 ,
      "url": "https://www.koton.com/pamuklu-regular-fit-kisa-kollu-bisiklet-yaka-basic-5-li-erkek-tisort-seti-mavi-4038602-3/",
      "stock": 166,
      "color": "MULTICOLOR",
      "size": "S",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/04/22/3059577/cc762684-86f4-465e-b89f-f8094ee846c6.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Çok Satan" src="https://ktnimg2.mncdn.com/cms/2023/12/07/4fc523ee-7f99-46fd-a081-fd2fd46f99fd.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal -intersected -mounted" pagination="" data-render="true">
      <div class="pz-carousel__container splide splide--slide splide--ltr splide--draggable is-active is-overflow is-initialized" id="splide11" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide11-track" style="padding-left: 0rem; padding-right: 0rem;" aria-live="polite" aria-atomic="true">
          <ul class="pz-carousel__list splide__list" id="splide11-list" role="presentation" style="transform: translateX(0px);"><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide11-slide01" role="tabpanel" aria-roledescription="slide" aria-label="1 of 2" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/pamuklu-regular-fit-kisa-kollu-bisiklet-yaka-basic-5-li-erkek-tisort-seti-mavi-4038602-3/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder slider="" class="pz-image-placeholder block relative -intersected">
      <picture>
        <source media="(max-width: 768px)" srcset="https://ktnimg2.mncdn.com/products/2025/04/22/3059577/cc762684-86f4-465e-b89f-f8094ee846c6_size354x464.jpg">
        <img width="708" height="930" alt=" Pamuklu Regular Fit Kısa Kollu Bisiklet Yaka Basic 5'li Erkek Tişört Seti" src="https://ktnimg2.mncdn.com/products/2025/04/22/3059577/cc762684-86f4-465e-b89f-f8094ee846c6_size708x930.jpg">
      </picture>
    </pz-image-placeholder>
  </a></li><li class="pz-carousel__slide splide__slide is-next" id="splide11-slide02" role="tabpanel" aria-roledescription="slide" aria-label="2 of 2" aria-hidden="true" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/pamuklu-regular-fit-kisa-kollu-bisiklet-yaka-basic-5-li-erkek-tisort-seti-mavi-4038602-3/" class="product-link js-product-link" aria-label="Go to Product" target="_blank" tabindex="-1"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative" style="aspect-ratio: 1 / 1;">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/04/22/3059577/830f622d-8ccb-4af5-87f0-eb793e3fcd2f_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/04/22/3059577/830f622d-8ccb-4af5-87f0-eb793e3fcd2f_size708x930.jpg" alt=" Pamuklu Regular Fit Kısa Kollu Bisiklet Yaka Basic 5'li Erkek Tişört Seti">
      </picture>
    </pz-image-placeholder>
  </a></li></ul>
        </div>
      <ul class="splide__pagination splide__pagination--ltr" role="tablist" aria-label="Select a slide to show"><li role="presentation"><button class="splide__pagination__page is-active" type="button" role="tab" aria-controls="splide11-slide01" aria-label="Go to slide 1" aria-selected="true"></button></li><li role="presentation"><button class="splide__pagination__page" type="button" role="tab" aria-controls="splide11-slide02" aria-label="Go to slide 2" tabindex="-1"></button></li></ul></div>
    </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Pamuklu Regular Fit Kısa Kollu Bisiklet Yaka Basic 5'li Erkek Tişört Seti",
        "item_id": "8684632253199",
        "price":  1299.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS BSC",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "MULTICOLOR|S",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 5 ,
        "quantity":1,
        "base_code": "5SAM10366HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1367862">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="MIX" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Pamuklu Regular Fit Kısa Kollu Bisiklet Yaka Basic 5'li Erkek Tişört Seti Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/pamuklu-regular-fit-kisa-kollu-bisiklet-yaka-basic-5-li-erkek-tisort-seti-mavi-4038602-3/" target="_blank" class="js-product-link product-link"> Pamuklu Regular Fit Kısa Kollu Bisiklet Yaka Basic 5'li Erkek Tişört Seti </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10366HK" link-url="/pamuklu-regular-fit-kisa-kollu-bisiklet-yaka-basic-5-li-erkek-tisort-seti-mavi-4038602-3/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">1.299,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/pamuklu-regular-fit-kisa-kollu-bisiklet-yaka-basic-5-li-erkek-tisort-seti-mavi-4038602-3/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/04/22/3059577/cc762684-86f4-465e-b89f-f8094ee846c6_size680x892_cropCenter.jpg" aria-label="Pamuklu Regular Fit Kısa Kollu Bisiklet Yaka Basic 5'li Erkek Tişört Seti MIX direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Regular Fit Kısa Kollu Bisiklet Yaka Basic 5'li Erkek Tişört Seti-MIX" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/04/22/3059583/59b39143-7139-473f-be4e-ccdcac00468f_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"><span>1.000 TL ve ÜZERİNE %15 + KTN25 KODU İLE EK %25 İNDİRİM</span></div>
          <pz-mobile-quickshop url="/pamuklu-regular-fit-kisa-kollu-bisiklet-yaka-basic-5-li-erkek-tisort-seti-mavi-4038602-3/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="7" class="js-product-wrapper product-item  " data-sku="8684632252956" data-pk="1368553" data-url="/bisiklet-yaka-pamuklu-kisa-kollu-regular-fit-basic-3-lu-erkek-tisort-seti-mavi-4039197/" data-price="779.99" data-key="integration_color_desc" data-value="MIX" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684632252956",
      "name": "Bisiklet Yaka Pamuklu Kısa Kollu Regular Fit Basic 3'lü Erkek Tişört Seti",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS BSC"],
      "currency": "TRY",
      "unit_price":  779.99 ,
      "unit_sale_price":  779.99 ,
      "url": "https://www.koton.com/bisiklet-yaka-pamuklu-kisa-kollu-regular-fit-basic-3-lu-erkek-tisort-seti-mavi-4039197/",
      "stock": 0,
      "color": "MULTICOLOR",
      "size": "M",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/02/27/3062056/6101b2ef-b4e1-472f-912e-8c97313092fc.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Çok Satan" src="https://ktnimg2.mncdn.com/cms/2023/12/07/4fc523ee-7f99-46fd-a081-fd2fd46f99fd.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal -intersected -mounted" pagination="" data-render="true">
      <div class="pz-carousel__container splide splide--slide splide--ltr splide--draggable is-active is-overflow is-initialized" id="splide12" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide12-track" style="padding-left: 0rem; padding-right: 0rem;" aria-live="polite" aria-atomic="true">
          <ul class="pz-carousel__list splide__list" id="splide12-list" role="presentation" style="transform: translateX(0px);"><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide12-slide01" role="tabpanel" aria-roledescription="slide" aria-label="1 of 2" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/bisiklet-yaka-pamuklu-kisa-kollu-regular-fit-basic-3-lu-erkek-tisort-seti-mavi-4039197/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder slider="" class="pz-image-placeholder block relative -intersected">
      <picture>
        <source media="(max-width: 768px)" srcset="https://ktnimg2.mncdn.com/products/2025/02/27/3062056/6101b2ef-b4e1-472f-912e-8c97313092fc_size354x464.jpg">
        <img width="708" height="930" alt=" Bisiklet Yaka Pamuklu Kısa Kollu Regular Fit Basic 3'lü Erkek Tişört Seti" src="https://ktnimg2.mncdn.com/products/2025/02/27/3062056/6101b2ef-b4e1-472f-912e-8c97313092fc_size708x930.jpg">
      </picture>
    </pz-image-placeholder>
  </a></li><li class="pz-carousel__slide splide__slide is-next" id="splide12-slide02" role="tabpanel" aria-roledescription="slide" aria-label="2 of 2" aria-hidden="true" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/bisiklet-yaka-pamuklu-kisa-kollu-regular-fit-basic-3-lu-erkek-tisort-seti-mavi-4039197/" class="product-link js-product-link" aria-label="Go to Product" target="_blank" tabindex="-1"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative" style="aspect-ratio: 1 / 1;">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/02/27/3062056/0904d169-1387-4ced-8a67-2519018d1329_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/02/27/3062056/0904d169-1387-4ced-8a67-2519018d1329_size708x930.jpg" alt=" Bisiklet Yaka Pamuklu Kısa Kollu Regular Fit Basic 3'lü Erkek Tişört Seti">
      </picture>
    </pz-image-placeholder>
  </a></li></ul>
        </div>
      <ul class="splide__pagination splide__pagination--ltr" role="tablist" aria-label="Select a slide to show"><li role="presentation"><button class="splide__pagination__page is-active" type="button" role="tab" aria-controls="splide12-slide01" aria-label="Go to slide 1" aria-selected="true"></button></li><li role="presentation"><button class="splide__pagination__page" type="button" role="tab" aria-controls="splide12-slide02" aria-label="Go to slide 2" tabindex="-1"></button></li></ul></div>
    </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Bisiklet Yaka Pamuklu Kısa Kollu Regular Fit Basic 3'lü Erkek Tişört Seti",
        "item_id": "8684632252956",
        "price":  779.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS BSC",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "MULTICOLOR|M",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 6 ,
        "quantity":1,
        "base_code": "5SAM10364HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1368553">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="MIX" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Bisiklet Yaka Pamuklu Kısa Kollu Regular Fit Basic 3'lü Erkek Tişört Seti Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/bisiklet-yaka-pamuklu-kisa-kollu-regular-fit-basic-3-lu-erkek-tisort-seti-mavi-4039197/" target="_blank" class="js-product-link product-link"> Bisiklet Yaka Pamuklu Kısa Kollu Regular Fit Basic 3'lü Erkek Tişört Seti </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10364HK" link-url="/bisiklet-yaka-pamuklu-kisa-kollu-regular-fit-basic-3-lu-erkek-tisort-seti-mavi-4039197/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">779,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/bisiklet-yaka-pamuklu-kisa-kollu-regular-fit-basic-3-lu-erkek-tisort-seti-mavi-4039197/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/02/27/3062056/6101b2ef-b4e1-472f-912e-8c97313092fc_size680x892_cropCenter.jpg" aria-label="Bisiklet Yaka Pamuklu Kısa Kollu Regular Fit Basic 3'lü Erkek Tişört Seti MIX direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Bisiklet Yaka Pamuklu Kısa Kollu Regular Fit Basic 3'lü Erkek Tişört Seti-MIX" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/02/27/3062056/c837daa9-43a0-459d-89d3-bbc0478ab770_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"></div>
          <pz-mobile-quickshop url="/bisiklet-yaka-pamuklu-kisa-kollu-regular-fit-basic-3-lu-erkek-tisort-seti-mavi-4039197/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="8" class="js-product-wrapper product-item  " data-sku="8684632252833" data-pk="1367867" data-url="/v-yaka-pamuklu-slim-fit-basic-3-lu-erkek-tisort-seti-mavi-4038533/" data-price="899.99" data-key="integration_color_desc" data-value="MIX" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684632252833",
      "name": "V Yaka Pamuklu Slim Fit Basic 3'lü Erkek Tişört Seti",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS BSC"],
      "currency": "TRY",
      "unit_price":  899.99 ,
      "unit_sale_price":  899.99 ,
      "url": "https://www.koton.com/v-yaka-pamuklu-slim-fit-basic-3-lu-erkek-tisort-seti-mavi-4038533/",
      "stock": 414,
      "color": "MULTICOLOR",
      "size": "L",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/02/21/3059582/db9a7a56-a693-4abd-a68e-2ddddeaba292.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Çok Satan" src="https://ktnimg2.mncdn.com/cms/2023/12/07/4fc523ee-7f99-46fd-a081-fd2fd46f99fd.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal -intersected -mounted" pagination="" data-render="true">
      <div class="pz-carousel__container splide splide--slide splide--ltr splide--draggable is-active is-overflow is-initialized" id="splide14" role="region" aria-roledescription="carousel">
        <div class="pz-carousel__list-wrapper splide__track splide__track--slide splide__track--ltr splide__track--draggable" id="splide14-track" style="padding-left: 0rem; padding-right: 0rem;" aria-live="polite" aria-atomic="true">
          <ul class="pz-carousel__list splide__list" id="splide14-list" role="presentation" style="transform: translateX(0px);"><li class="pz-carousel__slide splide__slide is-active is-visible" id="splide14-slide01" role="tabpanel" aria-roledescription="slide" aria-label="1 of 2" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/v-yaka-pamuklu-slim-fit-basic-3-lu-erkek-tisort-seti-mavi-4038533/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder slider="" class="pz-image-placeholder block relative -intersected">
      <picture>
        <source media="(max-width: 768px)" srcset="https://ktnimg2.mncdn.com/products/2025/02/21/3059582/db9a7a56-a693-4abd-a68e-2ddddeaba292_size354x464.jpg">
        <img width="708" height="930" alt=" V Yaka Pamuklu Slim Fit Basic 3'lü Erkek Tişört Seti" src="https://ktnimg2.mncdn.com/products/2025/02/21/3059582/db9a7a56-a693-4abd-a68e-2ddddeaba292_size708x930.jpg">
      </picture>
    </pz-image-placeholder>
  </a></li><li class="pz-carousel__slide splide__slide is-next" id="splide14-slide02" role="tabpanel" aria-roledescription="slide" aria-label="2 of 2" aria-hidden="true" style="margin-right: 0rem; width: calc(100% + 0rem);"><a href="/v-yaka-pamuklu-slim-fit-basic-3-lu-erkek-tisort-seti-mavi-4038533/" class="product-link js-product-link" aria-label="Go to Product" target="_blank" tabindex="-1"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative" style="aspect-ratio: 1 / 1;">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/02/21/3059582/8d286a74-1190-4f1a-bf53-d4c4ecba0384_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/02/21/3059582/8d286a74-1190-4f1a-bf53-d4c4ecba0384_size708x930.jpg" alt=" V Yaka Pamuklu Slim Fit Basic 3'lü Erkek Tişört Seti">
      </picture>
    </pz-image-placeholder>
  </a></li></ul>
        </div>
      <ul class="splide__pagination splide__pagination--ltr" role="tablist" aria-label="Select a slide to show"><li role="presentation"><button class="splide__pagination__page is-active" type="button" role="tab" aria-controls="splide14-slide01" aria-label="Go to slide 1" aria-selected="true"></button></li><li role="presentation"><button class="splide__pagination__page" type="button" role="tab" aria-controls="splide14-slide02" aria-label="Go to slide 2" tabindex="-1"></button></li></ul></div>
    </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "V Yaka Pamuklu Slim Fit Basic 3'lü Erkek Tişört Seti",
        "item_id": "8684632252833",
        "price":  899.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS BSC",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "MULTICOLOR|L",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 7 ,
        "quantity":1,
        "base_code": "5SAM10363HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1367867">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="MIX" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="V Yaka Pamuklu Slim Fit Basic 3'lü Erkek Tişört Seti Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/v-yaka-pamuklu-slim-fit-basic-3-lu-erkek-tisort-seti-mavi-4038533/" target="_blank" class="js-product-link product-link"> V Yaka Pamuklu Slim Fit Basic 3'lü Erkek Tişört Seti </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10363HK" link-url="/v-yaka-pamuklu-slim-fit-basic-3-lu-erkek-tisort-seti-mavi-4038533/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">899,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/v-yaka-pamuklu-slim-fit-basic-3-lu-erkek-tisort-seti-mavi-4038533/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/02/21/3059582/db9a7a56-a693-4abd-a68e-2ddddeaba292_size680x892_cropCenter.jpg" aria-label="V Yaka Pamuklu Slim Fit Basic 3'lü Erkek Tişört Seti MIX direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="V Yaka Pamuklu Slim Fit Basic 3'lü Erkek Tişört Seti-MIX" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/02/21/3059582/6fee0174-2a93-4d24-a4c0-48e7591554aa_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"><span>1.000 TL ve ÜZERİNE %15 + KTN25 KODU İLE EK %25 İNDİRİM</span></div>
          <pz-mobile-quickshop url="/v-yaka-pamuklu-slim-fit-basic-3-lu-erkek-tisort-seti-mavi-4038533/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="9" class="js-product-wrapper product-item  " data-sku="8684632253083" data-pk="1362376" data-url="/kisa-kollu-regular-fit-bisiklet-yaka-pamuklu-3-lu-basic-tisort-seti-mavi-4038534/" data-price="779.99" data-key="integration_color_desc" data-value="MIX" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684632253083",
      "name": "Kısa Kollu Regular Fit Bisiklet Yaka Pamuklu 3'lü Basic Tişört Seti",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS BSC"],
      "currency": "TRY",
      "unit_price":  779.99 ,
      "unit_sale_price":  779.99 ,
      "url": "https://www.koton.com/kisa-kollu-regular-fit-bisiklet-yaka-pamuklu-3-lu-basic-tisort-seti-mavi-4038534/",
      "stock": 222,
      "color": "MULTICOLOR",
      "size": "S",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/02/20/3052195/4e6d4cef-91c9-4c8c-9966-4875a5ee640c.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Çok Satan" src="https://ktnimg2.mncdn.com/cms/2023/12/07/4fc523ee-7f99-46fd-a081-fd2fd46f99fd.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/kisa-kollu-regular-fit-bisiklet-yaka-pamuklu-3-lu-basic-tisort-seti-mavi-4038534/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/02/20/3052195/4e6d4cef-91c9-4c8c-9966-4875a5ee640c_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/02/20/3052195/4e6d4cef-91c9-4c8c-9966-4875a5ee640c_size708x930.jpg" alt=" Kısa Kollu Regular Fit Bisiklet Yaka Pamuklu 3'lü Basic Tişört Seti">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/kisa-kollu-regular-fit-bisiklet-yaka-pamuklu-3-lu-basic-tisort-seti-mavi-4038534/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/02/20/3052195/c21b753c-b555-4d6a-abd1-e26c1674ac5b_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/02/20/3052195/c21b753c-b555-4d6a-abd1-e26c1674ac5b_size708x930.jpg" alt=" Kısa Kollu Regular Fit Bisiklet Yaka Pamuklu 3'lü Basic Tişört Seti">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Kısa Kollu Regular Fit Bisiklet Yaka Pamuklu 3'lü Basic Tişört Seti",
        "item_id": "8684632253083",
        "price":  779.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS BSC",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "MULTICOLOR|S",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 8 ,
        "quantity":1,
        "base_code": "5SAM10365HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1362376">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="MIX" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Kısa Kollu Regular Fit Bisiklet Yaka Pamuklu 3'lü Basic Tişört Seti Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/kisa-kollu-regular-fit-bisiklet-yaka-pamuklu-3-lu-basic-tisort-seti-mavi-4038534/" target="_blank" class="js-product-link product-link"> Kısa Kollu Regular Fit Bisiklet Yaka Pamuklu 3'lü Basic Tişört Seti </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10365HK" link-url="/kisa-kollu-regular-fit-bisiklet-yaka-pamuklu-3-lu-basic-tisort-seti-mavi-4038534/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">779,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/kisa-kollu-regular-fit-bisiklet-yaka-pamuklu-3-lu-basic-tisort-seti-mavi-4038534/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/02/20/3052195/4e6d4cef-91c9-4c8c-9966-4875a5ee640c_size680x892_cropCenter.jpg" aria-label="Kısa Kollu Regular Fit Bisiklet Yaka Pamuklu 3'lü Basic Tişört Seti MIX direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Kısa Kollu Regular Fit Bisiklet Yaka Pamuklu 3'lü Basic Tişört Seti-MIX" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/01/31/3052183/1c58f1f3-b428-4e12-bbb4-28f33ce5a615_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"><span>1.000 TL ve ÜZERİNE %15 + KTN25 KODU İLE EK %25 İNDİRİM</span></div>
          <pz-mobile-quickshop url="/kisa-kollu-regular-fit-bisiklet-yaka-pamuklu-3-lu-basic-tisort-seti-mavi-4038534/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="10" class="js-product-wrapper product-item  " data-sku="8684756810087" data-pk="1385828" data-url="/kisa-kollu-v-yaka-ajurlu-triko-tisort-kahve-4060910/" data-price="1299.99" data-key="integration_color_desc" data-value="545" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684756810087",
      "name": "Kısa Kollu V Yaka Ajurlu Triko Tişört",
      "taxonomy":["MENSWEAR","SMART","MEN","KNITWEAR","SWEATERS"],
      "currency": "TRY",
      "unit_price":  1299.99 ,
      "unit_sale_price":  1299.99 ,
      "url": "https://www.koton.com/kisa-kollu-v-yaka-ajurlu-triko-tisort-kahve-4060910/",
      "stock": 17,
      "color": "KAHVERENGİ",
      "size": "S",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/06/25/3078024/8aeed735-a379-42a9-9e2b-0fb73f85e1e5.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Yeni Sezon" src="https://ktnimg2.mncdn.com/cms/2023/12/07/a90a49e7-1d92-4293-a6f1-ce6cf1a00ce8.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/kisa-kollu-v-yaka-ajurlu-triko-tisort-kahve-4060910/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/06/25/3078024/8aeed735-a379-42a9-9e2b-0fb73f85e1e5_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/06/25/3078024/8aeed735-a379-42a9-9e2b-0fb73f85e1e5_size708x930.jpg" alt=" Kısa Kollu V Yaka Ajurlu Triko Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/kisa-kollu-v-yaka-ajurlu-triko-tisort-kahve-4060910/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/06/25/3078024/a01aa004-795b-4c98-96d4-f9806952491c_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/06/25/3078024/a01aa004-795b-4c98-96d4-f9806952491c_size708x930.jpg" alt=" Kısa Kollu V Yaka Ajurlu Triko Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Kısa Kollu V Yaka Ajurlu Triko Tişört",
        "item_id": "8684756810087",
        "price":  1299.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"SMART",
        "item_category3":"MEN",
        "item_category4":"KNITWEAR",
        "item_category5":"SWEATERS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "KAHVERENGİ|S",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 9 ,
        "quantity":1,
        "base_code": "5SAM70063HT"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1385828">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="545" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Kısa Kollu V Yaka Ajurlu Triko Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/kisa-kollu-v-yaka-ajurlu-triko-tisort-kahve-4060910/" target="_blank" class="js-product-link product-link"> Kısa Kollu V Yaka Ajurlu Triko Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM70063HT" link-url="/kisa-kollu-v-yaka-ajurlu-triko-tisort-kahve-4060910/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">1.299,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/kisa-kollu-v-yaka-ajurlu-triko-tisort-kahve-4060910/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/06/25/3078024/8aeed735-a379-42a9-9e2b-0fb73f85e1e5_size680x892_cropCenter.jpg" aria-label="Kısa Kollu V Yaka Ajurlu Triko Tişört 545 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Kısa Kollu V Yaka Ajurlu Triko Tişört-545" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/04/29/3078023/64da9902-6999-425e-a432-ec715f1781ca_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"><span>1.000 TL ve ÜZERİNE %15 + KTN25 KODU İLE EK %25 İNDİRİM</span></div>
          <pz-mobile-quickshop url="/kisa-kollu-v-yaka-ajurlu-triko-tisort-kahve-4060910/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="11" class="js-product-wrapper product-item  " data-sku="8684756747826" data-pk="1388592" data-url="/pamuklu-kisa-kollu-dokulu-regular-fit-polo-yaka-tisort-sari-4054011-3/" data-price="799.99" data-key="integration_color_desc" data-value="151" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684756747826",
      "name": "Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS POLO"],
      "currency": "TRY",
      "unit_price":  799.99 ,
      "unit_sale_price":  799.99 ,
      "url": "https://www.koton.com/pamuklu-kisa-kollu-dokulu-regular-fit-polo-yaka-tisort-sari-4054011-3/",
      "stock": 10,
      "color": "SARI",
      "size": "L",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/06/25/3081244/960b3819-508a-4656-8301-68dec9cc7fdf.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Çok Satan" src="https://ktnimg2.mncdn.com/cms/2023/12/07/4fc523ee-7f99-46fd-a081-fd2fd46f99fd.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/pamuklu-kisa-kollu-dokulu-regular-fit-polo-yaka-tisort-sari-4054011-3/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/06/25/3081244/960b3819-508a-4656-8301-68dec9cc7fdf_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/06/25/3081244/960b3819-508a-4656-8301-68dec9cc7fdf_size708x930.jpg" alt=" Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/pamuklu-kisa-kollu-dokulu-regular-fit-polo-yaka-tisort-sari-4054011-3/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/05/09/3081212/2a6a0ad6-3d8d-4f58-830e-623d7722da0f_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/05/09/3081212/2a6a0ad6-3d8d-4f58-830e-623d7722da0f_size708x930.jpg" alt=" Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört",
        "item_id": "8684756747826",
        "price":  799.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS POLO",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "SARI|L",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 10 ,
        "quantity":1,
        "base_code": "5SAM10114MK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1388592">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="151" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/pamuklu-kisa-kollu-dokulu-regular-fit-polo-yaka-tisort-sari-4054011-3/" target="_blank" class="js-product-link product-link"> Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10114MK" link-url="/pamuklu-kisa-kollu-dokulu-regular-fit-polo-yaka-tisort-sari-4054011-3/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">799,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button="">+(3) Renk</div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/pamuklu-kisa-kollu-dokulu-regular-fit-polo-yaka-tisort-beyaz-4065842-3/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/05/09/3081246/bfc27fde-a7ad-4021-8d28-096f577fc5a6_size680x892_cropCenter.jpg" aria-label="Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört 000 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört-000" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/05/09/3081215/f5679242-c74d-4f97-8ad2-9eb597184c7a_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/pamuklu-kisa-kollu-dokulu-regular-fit-polo-yaka-tisort-sari-4054011-3/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/06/25/3081244/960b3819-508a-4656-8301-68dec9cc7fdf_size680x892_cropCenter.jpg" aria-label="Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört 151 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört-151" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/05/09/3081244/11a0a12e-76e7-41a3-99d8-a56c0e6a8739_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/pamuklu-kisa-kollu-dokulu-regular-fit-polo-yaka-tisort-gul-4065893-2/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/05/09/3080877/7140e8ef-fd65-4db8-9623-22fb84f650d4_size680x892_cropCenter.jpg" aria-label="Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört 250 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört-250" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/04/25/3080868/947019e7-c122-4e27-8277-3881d5efbef5_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/pamuklu-kisa-kollu-dokulu-regular-fit-polo-yaka-tisort-kahve-4065843/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/05/09/3081249/5cb43283-4d1b-458a-8c02-a6678c608633_size680x892_cropCenter.jpg" aria-label="Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört 545 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört-545" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/05/09/3081228/0ebfe52c-4715-4c0f-b898-6ace3d082465_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"></div>
          <pz-mobile-quickshop url="/pamuklu-kisa-kollu-dokulu-regular-fit-polo-yaka-tisort-sari-4054011-3/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="12" class="js-product-wrapper product-item  " data-sku="8684290678839" data-pk="1378119" data-url="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-bordo-3966580-3/" data-price="799.99" data-key="integration_color_desc" data-value="467" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684290678839",
      "name": "Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS POLO"],
      "currency": "TRY",
      "unit_price":  799.99 ,
      "unit_sale_price":  799.99 ,
      "url": "https://www.koton.com/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-bordo-3966580-3/",
      "stock": 0,
      "color": "BORDO",
      "size": "L",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/06/13/3035506/07d54f9a-80aa-49d2-9707-4d9fe3b07377.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Çok Satan" src="https://ktnimg2.mncdn.com/cms/2023/12/07/4fc523ee-7f99-46fd-a081-fd2fd46f99fd.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-bordo-3966580-3/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/06/13/3035506/07d54f9a-80aa-49d2-9707-4d9fe3b07377_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/06/13/3035506/07d54f9a-80aa-49d2-9707-4d9fe3b07377_size708x930.jpg" alt=" Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-bordo-3966580-3/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/06/13/3035506/055e2f99-6537-4027-8291-1acaf2261994_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/06/13/3035506/055e2f99-6537-4027-8291-1acaf2261994_size708x930.jpg" alt=" Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört",
        "item_id": "8684290678839",
        "price":  799.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS POLO",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "BORDO|L",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 11 ,
        "quantity":1,
        "base_code": "5SAM10015MK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1378119">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="467" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-bordo-3966580-3/" target="_blank" class="js-product-link product-link"> Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10015MK" link-url="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-bordo-3966580-3/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">799,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button="">+(7) Renk</div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-beyaz-3966579-4/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/04/29/3077328/d6780edd-f55f-4c06-83c6-43e1fa075f59_size680x892_cropCenter.jpg" aria-label="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört 000 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört-000" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/04/29/3077325/f6842d85-db1c-44c2-b6fa-d8aeafdec091_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-gri-3982536-3/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2024/11/29/3021417/69bfc67d-a9b5-4d2a-a556-c4456604f5a2_size680x892_cropCenter.jpg" aria-label="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört 031 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört-031" loading="lazy" src="https://ktnimg2.mncdn.com/products/2024/11/29/3021417/fcea1dde-9d6b-42e3-a624-8eb0053c049d_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-bordo-3966580-3/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/06/13/3035506/07d54f9a-80aa-49d2-9707-4d9fe3b07377_size680x892_cropCenter.jpg" aria-label="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört 467 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört-467" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/06/13/3035506/3f439b21-d348-4808-a2b5-903add1b22e0_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-mavi-3982537/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2024/11/27/3021015/88406169-73a8-49b8-a41f-c571b795c39c_size680x892_cropCenter.jpg" aria-label="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört 624 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört-624" loading="lazy" src="https://ktnimg2.mncdn.com/products/2024/11/27/3021015/3d5b7660-1586-406b-8f0e-e323da0b8c06_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-lacivert-3966581/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2024/11/28/3021548/ff044bc5-c8f2-4618-88e0-5beaf0751b00_size680x892_cropCenter.jpg" aria-label="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört 716 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört-716" loading="lazy" src="https://ktnimg2.mncdn.com/products/2024/11/28/3021548/c8aecc60-9c45-4da6-b258-00630c175e03_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-yesil-3982538/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/01/07/3039020/df8912b9-b21d-486b-b327-4da3dde58c5b_size680x892_cropCenter.jpg" aria-label="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört 786 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört-786" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/01/07/3039020/d4c76424-495c-435c-9ae7-fc7829dfe7c6_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-bordo-3966580-3/" class="product-item__info-color-variants-more-color js-product-link product-link" target="_blank">+2 renk</a></pz-carousel>
          </div><div class="product-item__info-campaign"><span>1.000 TL ve ÜZERİNE %20 + KTN25 KODU İLE EK %25 İNDİRİM</span></div>
          <pz-mobile-quickshop url="/slim-fit-kisa-kollu-pike-kumas-pamuklu-polo-yaka-tisort-bordo-3966580-3/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="13" class="js-product-wrapper product-item  " data-sku="8684758139629" data-pk="1394937" data-url="/kisa-kollu-regular-fit-pamuklu-bisiklet-yaka-baskili-tisort-bordo-4071866-3/" data-price="499.99" data-key="integration_color_desc" data-value="457" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684758139629",
      "name": "Kısa Kollu Regular Fit Pamuklu Bisiklet Yaka Baskılı Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  499.99 ,
      "unit_sale_price":  499.99 ,
      "url": "https://www.koton.com/kisa-kollu-regular-fit-pamuklu-bisiklet-yaka-baskili-tisort-bordo-4071866-3/",
      "stock": 1,
      "color": "BORDO",
      "size": "XXL",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/05/26/3089785/dd92c17e-6ae8-432e-a127-d509577fcb57.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Çok Satan" src="https://ktnimg2.mncdn.com/cms/2023/12/07/4fc523ee-7f99-46fd-a081-fd2fd46f99fd.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/kisa-kollu-regular-fit-pamuklu-bisiklet-yaka-baskili-tisort-bordo-4071866-3/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/05/26/3089785/dd92c17e-6ae8-432e-a127-d509577fcb57_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/05/26/3089785/dd92c17e-6ae8-432e-a127-d509577fcb57_size708x930.jpg" alt=" Kısa Kollu Regular Fit Pamuklu Bisiklet Yaka Baskılı Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/kisa-kollu-regular-fit-pamuklu-bisiklet-yaka-baskili-tisort-bordo-4071866-3/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/05/26/3089785/c4cb6853-d12a-442b-a534-76b1c2716da3_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/05/26/3089785/c4cb6853-d12a-442b-a534-76b1c2716da3_size708x930.jpg" alt=" Kısa Kollu Regular Fit Pamuklu Bisiklet Yaka Baskılı Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Kısa Kollu Regular Fit Pamuklu Bisiklet Yaka Baskılı Tişört",
        "item_id": "8684758139629",
        "price":  499.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "BORDO|XXL",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 12 ,
        "quantity":1,
        "base_code": "5SAM10456HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1394937">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="457" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Kısa Kollu Regular Fit Pamuklu Bisiklet Yaka Baskılı Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/kisa-kollu-regular-fit-pamuklu-bisiklet-yaka-baskili-tisort-bordo-4071866-3/" target="_blank" class="js-product-link product-link"> Kısa Kollu Regular Fit Pamuklu Bisiklet Yaka Baskılı Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10456HK" link-url="/kisa-kollu-regular-fit-pamuklu-bisiklet-yaka-baskili-tisort-bordo-4071866-3/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">499,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/kisa-kollu-regular-fit-pamuklu-bisiklet-yaka-baskili-tisort-bordo-4071866-3/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/05/26/3089785/dd92c17e-6ae8-432e-a127-d509577fcb57_size680x892_cropCenter.jpg" aria-label="Kısa Kollu Regular Fit Pamuklu Bisiklet Yaka Baskılı Tişört 457 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Kısa Kollu Regular Fit Pamuklu Bisiklet Yaka Baskılı Tişört-457" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/05/26/3089800/da692dae-a777-4c64-b161-37893e333bec_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"></div>
          <pz-mobile-quickshop url="/kisa-kollu-regular-fit-pamuklu-bisiklet-yaka-baskili-tisort-bordo-4071866-3/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="14" class="js-product-wrapper product-item  " data-sku="8684758160036" data-pk="1399526" data-url="/kisa-kollu-bisiklet-yaka-pamuklu-oversize-arkasi-baskili-tisort-ekru-4072711/" data-price="599.99" data-key="integration_color_desc" data-value="050" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684758160036",
      "name": "Kısa Kollu Bisiklet Yaka Pamuklu Oversize Arkası Baskılı Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  599.99 ,
      "unit_sale_price":  599.99 ,
      "url": "https://www.koton.com/kisa-kollu-bisiklet-yaka-pamuklu-oversize-arkasi-baskili-tisort-ekru-4072711/",
      "stock": 19,
      "color": "BEJ",
      "size": "M",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/06/16/3094466/c6eda60f-3603-4d87-80aa-ea0d3d1a06c8.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Arkası Baskılı" src="https://ktnimg2.mncdn.com/cms/2025/03/24/0e617ea4-13b5-46d6-8949-dd44a7d11ee2.jpg"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/kisa-kollu-bisiklet-yaka-pamuklu-oversize-arkasi-baskili-tisort-ekru-4072711/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/06/16/3094466/c6eda60f-3603-4d87-80aa-ea0d3d1a06c8_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/06/16/3094466/c6eda60f-3603-4d87-80aa-ea0d3d1a06c8_size708x930.jpg" alt=" Kısa Kollu Bisiklet Yaka Pamuklu Oversize Arkası Baskılı Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/kisa-kollu-bisiklet-yaka-pamuklu-oversize-arkasi-baskili-tisort-ekru-4072711/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/06/16/3094466/01cc887a-01fa-452a-934a-7bc92096e6f3_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/06/16/3094466/01cc887a-01fa-452a-934a-7bc92096e6f3_size708x930.jpg" alt=" Kısa Kollu Bisiklet Yaka Pamuklu Oversize Arkası Baskılı Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Kısa Kollu Bisiklet Yaka Pamuklu Oversize Arkası Baskılı Tişört",
        "item_id": "8684758160036",
        "price":  599.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "BEJ|M",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 13 ,
        "quantity":1,
        "base_code": "5SAM10459HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1399526">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="050" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Kısa Kollu Bisiklet Yaka Pamuklu Oversize Arkası Baskılı Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/kisa-kollu-bisiklet-yaka-pamuklu-oversize-arkasi-baskili-tisort-ekru-4072711/" target="_blank" class="js-product-link product-link"> Kısa Kollu Bisiklet Yaka Pamuklu Oversize Arkası Baskılı Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10459HK" link-url="/kisa-kollu-bisiklet-yaka-pamuklu-oversize-arkasi-baskili-tisort-ekru-4072711/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">599,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/kisa-kollu-bisiklet-yaka-pamuklu-oversize-arkasi-baskili-tisort-ekru-4072711/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/06/16/3094466/c6eda60f-3603-4d87-80aa-ea0d3d1a06c8_size680x892_cropCenter.jpg" aria-label="Kısa Kollu Bisiklet Yaka Pamuklu Oversize Arkası Baskılı Tişört 050 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Kısa Kollu Bisiklet Yaka Pamuklu Oversize Arkası Baskılı Tişört-050" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/06/16/3094466/52736798-49e1-40fd-875d-d743137b7234_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"></div>
          <pz-mobile-quickshop url="/kisa-kollu-bisiklet-yaka-pamuklu-oversize-arkasi-baskili-tisort-ekru-4072711/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="15" class="js-product-wrapper product-item  " data-sku="8684290686032" data-pk="1370465" data-url="/baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-beyaz-3970245-2/" data-price="499.99" data-key="integration_color_desc" data-value="000" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684290686032",
      "name": "Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  499.99 ,
      "unit_sale_price":  499.99 ,
      "url": "https://www.koton.com/baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-beyaz-3970245-2/",
      "stock": 33,
      "color": "BEYAZ",
      "size": "L",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/02/26/3060733/d763c42b-096e-43e6-8519-eec03078b4f4.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Çok Satan" src="https://ktnimg2.mncdn.com/cms/2023/12/07/4fc523ee-7f99-46fd-a081-fd2fd46f99fd.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-beyaz-3970245-2/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/02/26/3060733/d763c42b-096e-43e6-8519-eec03078b4f4_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/02/26/3060733/d763c42b-096e-43e6-8519-eec03078b4f4_size708x930.jpg" alt=" Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-beyaz-3970245-2/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/02/26/3060731/8c8283dd-a47d-424e-820a-834752e7d8f1_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/02/26/3060731/8c8283dd-a47d-424e-820a-834752e7d8f1_size708x930.jpg" alt=" Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört",
        "item_id": "8684290686032",
        "price":  499.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "BEYAZ|L",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 14 ,
        "quantity":1,
        "base_code": "5SAM10134HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1370465">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="000" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-beyaz-3970245-2/" target="_blank" class="js-product-link product-link"> Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10134HK" link-url="/baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-beyaz-3970245-2/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">499,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-beyaz-3970245-2/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/02/26/3060733/d763c42b-096e-43e6-8519-eec03078b4f4_size680x892_cropCenter.jpg" aria-label="Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört 000 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört-000" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/02/26/3060731/a78ee322-7729-4df4-9908-613dd830ae6d_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"><span>1.000 TL ve ÜZERİNE %15 + KTN25 KODU İLE EK %25 İNDİRİM</span></div>
          <pz-mobile-quickshop url="/baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-beyaz-3970245-2/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="16" class="js-product-wrapper product-item  " data-sku="8684290474554" data-pk="1361260" data-url="/arkasi-baskili-kisa-kollu-viskon-karisimli-bisiklet-yaka-oversize-tisort-sari-3970107-1/" data-price="599.99" data-key="integration_color_desc" data-value="152" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684290474554",
      "name": "Arkası Baskılı Kısa Kollu Viskon Karışımlı Bisiklet Yaka Oversize Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  599.99 ,
      "unit_sale_price":  599.99 ,
      "url": "https://www.koton.com/arkasi-baskili-kisa-kollu-viskon-karisimli-bisiklet-yaka-oversize-tisort-sari-3970107-1/",
      "stock": 0,
      "color": "SARI",
      "size": "S",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2024/11/27/3020720/01a32699-0432-4178-9629-a9eb4b1d800d.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Arkası Baskılı" src="https://ktnimg2.mncdn.com/cms/2025/03/24/0e617ea4-13b5-46d6-8949-dd44a7d11ee2.jpg"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/arkasi-baskili-kisa-kollu-viskon-karisimli-bisiklet-yaka-oversize-tisort-sari-3970107-1/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2024/11/27/3020720/01a32699-0432-4178-9629-a9eb4b1d800d_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2024/11/27/3020720/01a32699-0432-4178-9629-a9eb4b1d800d_size708x930.jpg" alt=" Arkası Baskılı Kısa Kollu Viskon Karışımlı Bisiklet Yaka Oversize Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/arkasi-baskili-kisa-kollu-viskon-karisimli-bisiklet-yaka-oversize-tisort-sari-3970107-1/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2024/11/27/3020720/4f2724de-3fe1-412e-807e-8bec733c7ebf_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2024/11/27/3020720/4f2724de-3fe1-412e-807e-8bec733c7ebf_size708x930.jpg" alt=" Arkası Baskılı Kısa Kollu Viskon Karışımlı Bisiklet Yaka Oversize Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Arkası Baskılı Kısa Kollu Viskon Karışımlı Bisiklet Yaka Oversize Tişört",
        "item_id": "8684290474554",
        "price":  599.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "SARI|S",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 15 ,
        "quantity":1,
        "base_code": "5SAM10127HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1361260">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="152" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Arkası Baskılı Kısa Kollu Viskon Karışımlı Bisiklet Yaka Oversize Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/arkasi-baskili-kisa-kollu-viskon-karisimli-bisiklet-yaka-oversize-tisort-sari-3970107-1/" target="_blank" class="js-product-link product-link"> Arkası Baskılı Kısa Kollu Viskon Karışımlı Bisiklet Yaka Oversize Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10127HK" link-url="/arkasi-baskili-kisa-kollu-viskon-karisimli-bisiklet-yaka-oversize-tisort-sari-3970107-1/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">599,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/arkasi-baskili-kisa-kollu-viskon-karisimli-bisiklet-yaka-oversize-tisort-sari-3970107-1/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2024/11/27/3020720/01a32699-0432-4178-9629-a9eb4b1d800d_size680x892_cropCenter.jpg" aria-label="Arkası Baskılı Kısa Kollu Viskon Karışımlı Bisiklet Yaka Oversize Tişört 152 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Arkası Baskılı Kısa Kollu Viskon Karışımlı Bisiklet Yaka Oversize Tişört-152" loading="lazy" src="https://ktnimg2.mncdn.com/products/2024/11/27/3020720/1c86b55f-35fa-410a-8947-47d2d2052b79_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"></div>
          <pz-mobile-quickshop url="/arkasi-baskili-kisa-kollu-viskon-karisimli-bisiklet-yaka-oversize-tisort-sari-3970107-1/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="17" class="js-product-wrapper product-item  " data-sku="8684758006242" data-pk="1401582" data-url="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-lisansli-superman-tisort-ekru-4070749-3/" data-price="499.99" data-key="integration_color_desc" data-value="050" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684758006242",
      "name": "Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Lisanslı Superman Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  499.99 ,
      "unit_sale_price":  499.99 ,
      "url": "https://www.koton.com/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-lisansli-superman-tisort-ekru-4070749-3/",
      "stock": 9,
      "color": "BEJ",
      "size": "XL",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/06/16/3096713/f7853678-c17c-4b9d-b0f2-f8aad52d9c8d.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Baba-Oğul" src="https://ktnimg2.mncdn.com/cms/2025/06/17/515cb230-c39e-4b67-a8ad-7bff93e6c400.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-lisansli-superman-tisort-ekru-4070749-3/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/06/16/3096713/f7853678-c17c-4b9d-b0f2-f8aad52d9c8d_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/06/16/3096713/f7853678-c17c-4b9d-b0f2-f8aad52d9c8d_size708x930.jpg" alt=" Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Lisanslı Superman Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-lisansli-superman-tisort-ekru-4070749-3/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/06/16/3096713/e54b5d11-edda-4450-bda2-471ed8c72b62_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/06/16/3096713/e54b5d11-edda-4450-bda2-471ed8c72b62_size708x930.jpg" alt=" Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Lisanslı Superman Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Lisanslı Superman Tişört",
        "item_id": "8684758006242",
        "price":  499.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "BEJ|XL",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 16 ,
        "quantity":1,
        "base_code": "5SAM10425HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1401582">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="050" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Lisanslı Superman Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-lisansli-superman-tisort-ekru-4070749-3/" target="_blank" class="js-product-link product-link"> Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Lisanslı Superman Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10425HK" link-url="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-lisansli-superman-tisort-ekru-4070749-3/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">499,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-lisansli-superman-tisort-ekru-4070749-3/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/06/16/3096713/f7853678-c17c-4b9d-b0f2-f8aad52d9c8d_size680x892_cropCenter.jpg" aria-label="Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Lisanslı Superman Tişört 050 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Lisanslı Superman Tişört-050" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/06/16/3096694/cc653052-b9f1-4044-a241-d45cb656ef31_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"><span>1.000 TL ve ÜZERİNE %15 + KTN25 KODU İLE EK %25 İNDİRİM</span></div>
          <pz-mobile-quickshop url="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-lisansli-superman-tisort-ekru-4070749-3/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="18" class="js-product-wrapper product-item  " data-sku="8684758140489" data-pk="1400197" data-url="/oversize-pamuklu-kisa-kollu-lisansli-snoopy-baskili-tisort-gri-4071867/" data-price="599.99" data-key="integration_color_desc" data-value="024" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684758140489",
      "name": "Oversize Pamuklu Kısa Kollu Lisanslı Snoopy Baskılı Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  599.99 ,
      "unit_sale_price":  599.99 ,
      "url": "https://www.koton.com/oversize-pamuklu-kisa-kollu-lisansli-snoopy-baskili-tisort-gri-4071867/",
      "stock": 0,
      "color": "GRİ",
      "size": "XL",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/06/17/3095413/3f34b47f-d877-43e2-9289-518a9bf40567.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Arkası Baskılı" src="https://ktnimg2.mncdn.com/cms/2025/03/24/0e617ea4-13b5-46d6-8949-dd44a7d11ee2.jpg"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/oversize-pamuklu-kisa-kollu-lisansli-snoopy-baskili-tisort-gri-4071867/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/06/17/3095413/3f34b47f-d877-43e2-9289-518a9bf40567_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/06/17/3095413/3f34b47f-d877-43e2-9289-518a9bf40567_size708x930.jpg" alt=" Oversize Pamuklu Kısa Kollu Lisanslı Snoopy Baskılı Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/oversize-pamuklu-kisa-kollu-lisansli-snoopy-baskili-tisort-gri-4071867/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/06/17/3095413/d493735c-5bce-4d71-8761-c4c58d3b11af_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/06/17/3095413/d493735c-5bce-4d71-8761-c4c58d3b11af_size708x930.jpg" alt=" Oversize Pamuklu Kısa Kollu Lisanslı Snoopy Baskılı Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Oversize Pamuklu Kısa Kollu Lisanslı Snoopy Baskılı Tişört",
        "item_id": "8684758140489",
        "price":  599.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "GRİ|XL",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 17 ,
        "quantity":1,
        "base_code": "5SAM10465HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1400197">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="024" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Oversize Pamuklu Kısa Kollu Lisanslı Snoopy Baskılı Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/oversize-pamuklu-kisa-kollu-lisansli-snoopy-baskili-tisort-gri-4071867/" target="_blank" class="js-product-link product-link"> Oversize Pamuklu Kısa Kollu Lisanslı Snoopy Baskılı Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10465HK" link-url="/oversize-pamuklu-kisa-kollu-lisansli-snoopy-baskili-tisort-gri-4071867/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">599,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/oversize-pamuklu-kisa-kollu-lisansli-snoopy-baskili-tisort-gri-4071867/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/06/17/3095413/3f34b47f-d877-43e2-9289-518a9bf40567_size680x892_cropCenter.jpg" aria-label="Oversize Pamuklu Kısa Kollu Lisanslı Snoopy Baskılı Tişört 024 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Oversize Pamuklu Kısa Kollu Lisanslı Snoopy Baskılı Tişört-024" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/06/17/3095443/8874bf01-1c3c-4137-89ff-f30051e0cf2e_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"></div>
          <pz-mobile-quickshop url="/oversize-pamuklu-kisa-kollu-lisansli-snoopy-baskili-tisort-gri-4071867/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="19" class="js-product-wrapper product-item  " data-sku="8684757726875" data-pk="1393033" data-url="/pamuklu-baskili-kisa-reglan-kollu-bisiklet-yaka-renk-bloklu-oversize-lisansli-yale-tisort-beyaz-4066853-1/" data-price="799.99" data-key="integration_color_desc" data-value="000" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684757726875",
      "name": "Pamuklu Baskılı Kısa Reglan Kollu Bisiklet Yaka Renk Bloklu Oversize Lisanslı Yale Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  799.99 ,
      "unit_sale_price":  799.99 ,
      "url": "https://www.koton.com/pamuklu-baskili-kisa-reglan-kollu-bisiklet-yaka-renk-bloklu-oversize-lisansli-yale-tisort-beyaz-4066853-1/",
      "stock": 2,
      "color": "BEYAZ",
      "size": "M",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/05/15/3086211/2c12e557-eaf9-4e79-9fe2-5c3a1a097c96.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Çok Satan" src="https://ktnimg2.mncdn.com/cms/2023/12/07/4fc523ee-7f99-46fd-a081-fd2fd46f99fd.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/pamuklu-baskili-kisa-reglan-kollu-bisiklet-yaka-renk-bloklu-oversize-lisansli-yale-tisort-beyaz-4066853-1/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/05/15/3086211/2c12e557-eaf9-4e79-9fe2-5c3a1a097c96_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/05/15/3086211/2c12e557-eaf9-4e79-9fe2-5c3a1a097c96_size708x930.jpg" alt=" Pamuklu Baskılı Kısa Reglan Kollu Bisiklet Yaka Renk Bloklu Oversize Lisanslı Yale Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/pamuklu-baskili-kisa-reglan-kollu-bisiklet-yaka-renk-bloklu-oversize-lisansli-yale-tisort-beyaz-4066853-1/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/05/15/3086211/07c5efa8-af96-4d4f-a677-d5c1afe696cd_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/05/15/3086211/07c5efa8-af96-4d4f-a677-d5c1afe696cd_size708x930.jpg" alt=" Pamuklu Baskılı Kısa Reglan Kollu Bisiklet Yaka Renk Bloklu Oversize Lisanslı Yale Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Pamuklu Baskılı Kısa Reglan Kollu Bisiklet Yaka Renk Bloklu Oversize Lisanslı Yale Tişört",
        "item_id": "8684757726875",
        "price":  799.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "BEYAZ|M",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 18 ,
        "quantity":1,
        "base_code": "5SAM10430HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1393033">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="000" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Pamuklu Baskılı Kısa Reglan Kollu Bisiklet Yaka Renk Bloklu Oversize Lisanslı Yale Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/pamuklu-baskili-kisa-reglan-kollu-bisiklet-yaka-renk-bloklu-oversize-lisansli-yale-tisort-beyaz-4066853-1/" target="_blank" class="js-product-link product-link"> Pamuklu Baskılı Kısa Reglan Kollu Bisiklet Yaka Renk Bloklu Oversize Lisanslı Yale Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10430HK" link-url="/pamuklu-baskili-kisa-reglan-kollu-bisiklet-yaka-renk-bloklu-oversize-lisansli-yale-tisort-beyaz-4066853-1/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">799,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/pamuklu-baskili-kisa-reglan-kollu-bisiklet-yaka-renk-bloklu-oversize-lisansli-yale-tisort-beyaz-4066853-1/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/05/15/3086211/2c12e557-eaf9-4e79-9fe2-5c3a1a097c96_size680x892_cropCenter.jpg" aria-label="Pamuklu Baskılı Kısa Reglan Kollu Bisiklet Yaka Renk Bloklu Oversize Lisanslı Yale Tişört 000 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Baskılı Kısa Reglan Kollu Bisiklet Yaka Renk Bloklu Oversize Lisanslı Yale Tişört-000" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/05/15/3086211/2abde0dc-da1b-4574-8e2c-3219fd83efe1_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"></div>
          <pz-mobile-quickshop url="/pamuklu-baskili-kisa-reglan-kollu-bisiklet-yaka-renk-bloklu-oversize-lisansli-yale-tisort-beyaz-4066853-1/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="20" class="js-product-wrapper product-item  " data-sku="8684757880072" data-pk="1395212" data-url="/kisa-kollu-pamuklu-regular-fit-serit-detayli-bisiklet-yaka-baskili-lisansli-harvard-tisort-beyaz-4069695-2/" data-price="599.99" data-key="integration_color_desc" data-value="000" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684757880072",
      "name": "Kısa Kollu Pamuklu Regular Fit Şerit Detaylı Bisiklet Yaka Baskılı Lisanslı Harvard Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  599.99 ,
      "unit_sale_price":  599.99 ,
      "url": "https://www.koton.com/kisa-kollu-pamuklu-regular-fit-serit-detayli-bisiklet-yaka-baskili-lisansli-harvard-tisort-beyaz-4069695-2/",
      "stock": 1,
      "color": "BEYAZ",
      "size": "XL",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/05/16/3086312/d5d4f132-d75e-483a-a29a-23b73c756728.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Yeni Sezon" src="https://ktnimg2.mncdn.com/cms/2023/12/07/a90a49e7-1d92-4293-a6f1-ce6cf1a00ce8.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/kisa-kollu-pamuklu-regular-fit-serit-detayli-bisiklet-yaka-baskili-lisansli-harvard-tisort-beyaz-4069695-2/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/05/16/3086312/d5d4f132-d75e-483a-a29a-23b73c756728_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/05/16/3086312/d5d4f132-d75e-483a-a29a-23b73c756728_size708x930.jpg" alt=" Kısa Kollu Pamuklu Regular Fit Şerit Detaylı Bisiklet Yaka Baskılı Lisanslı Harvard Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/kisa-kollu-pamuklu-regular-fit-serit-detayli-bisiklet-yaka-baskili-lisansli-harvard-tisort-beyaz-4069695-2/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/05/16/3086312/c884436f-532e-48c8-aba9-7d5b80efa0ae_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/05/16/3086312/c884436f-532e-48c8-aba9-7d5b80efa0ae_size708x930.jpg" alt=" Kısa Kollu Pamuklu Regular Fit Şerit Detaylı Bisiklet Yaka Baskılı Lisanslı Harvard Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Kısa Kollu Pamuklu Regular Fit Şerit Detaylı Bisiklet Yaka Baskılı Lisanslı Harvard Tişört",
        "item_id": "8684757880072",
        "price":  599.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "BEYAZ|XL",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 19 ,
        "quantity":1,
        "base_code": "5SAM10438HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1395212">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="000" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Kısa Kollu Pamuklu Regular Fit Şerit Detaylı Bisiklet Yaka Baskılı Lisanslı Harvard Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/kisa-kollu-pamuklu-regular-fit-serit-detayli-bisiklet-yaka-baskili-lisansli-harvard-tisort-beyaz-4069695-2/" target="_blank" class="js-product-link product-link"> Kısa Kollu Pamuklu Regular Fit Şerit Detaylı Bisiklet Yaka Baskılı Lisanslı Harvard Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10438HK" link-url="/kisa-kollu-pamuklu-regular-fit-serit-detayli-bisiklet-yaka-baskili-lisansli-harvard-tisort-beyaz-4069695-2/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">599,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/kisa-kollu-pamuklu-regular-fit-serit-detayli-bisiklet-yaka-baskili-lisansli-harvard-tisort-beyaz-4069695-2/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/05/16/3086312/d5d4f132-d75e-483a-a29a-23b73c756728_size680x892_cropCenter.jpg" aria-label="Kısa Kollu Pamuklu Regular Fit Şerit Detaylı Bisiklet Yaka Baskılı Lisanslı Harvard Tişört 000 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Kısa Kollu Pamuklu Regular Fit Şerit Detaylı Bisiklet Yaka Baskılı Lisanslı Harvard Tişört-000" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/05/16/3086778/e3c89095-d66d-4db0-ba49-b5601d51d5d3_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"></div>
          <pz-mobile-quickshop url="/kisa-kollu-pamuklu-regular-fit-serit-detayli-bisiklet-yaka-baskili-lisansli-harvard-tisort-beyaz-4069695-2/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="21" class="js-product-wrapper product-item  " data-sku="8684756699729" data-pk="1378054" data-url="/arkasi-baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-gri-4053678/" data-price="449.99" data-key="integration_color_desc" data-value="031" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684756699729",
      "name": "Arkası Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  449.99 ,
      "unit_sale_price":  449.99 ,
      "url": "https://www.koton.com/arkasi-baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-gri-4053678/",
      "stock": 5,
      "color": "GRİ",
      "size": "XL",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/03/28/3070261/d5aa478d-9b30-4269-96bd-72a44a73445b.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Arkası Baskılı" src="https://ktnimg2.mncdn.com/cms/2025/03/24/0e617ea4-13b5-46d6-8949-dd44a7d11ee2.jpg"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/arkasi-baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-gri-4053678/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/03/28/3070261/d5aa478d-9b30-4269-96bd-72a44a73445b_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/03/28/3070261/d5aa478d-9b30-4269-96bd-72a44a73445b_size708x930.jpg" alt=" Arkası Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/arkasi-baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-gri-4053678/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/03/28/3070310/60b22245-2511-4ffc-b8f3-243c0c4a5b7d_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/03/28/3070310/60b22245-2511-4ffc-b8f3-243c0c4a5b7d_size708x930.jpg" alt=" Arkası Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Arkası Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört",
        "item_id": "8684756699729",
        "price":  449.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "GRİ|XL",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 20 ,
        "quantity":1,
        "base_code": "5SAM10384HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1378054">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="031" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Arkası Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/arkasi-baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-gri-4053678/" target="_blank" class="js-product-link product-link"> Arkası Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10384HK" link-url="/arkasi-baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-gri-4053678/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">449,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/arkasi-baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-gri-4053678/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/03/28/3070261/d5aa478d-9b30-4269-96bd-72a44a73445b_size680x892_cropCenter.jpg" aria-label="Arkası Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört 031 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Arkası Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört-031" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/03/28/3070310/e0f52874-c04f-40ac-8867-7a850669de02_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"><span>1.000 TL ve ÜZERİNE %15 + KTN25 KODU İLE EK %25 İNDİRİM</span></div>
          <pz-mobile-quickshop url="/arkasi-baskili-pamuklu-kisa-kollu-bisiklet-yaka-oversize-tisort-gri-4053678/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="22" class="js-product-wrapper product-item  " data-sku="8684757749713" data-pk="1395190" data-url="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-tisort-beyaz-4067274/" data-price="399.99" data-key="integration_color_desc" data-value="000" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684757749713",
      "name": "Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  399.99 ,
      "unit_sale_price":  399.99 ,
      "url": "https://www.koton.com/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-tisort-beyaz-4067274/",
      "stock": 17,
      "color": "BEYAZ",
      "size": "M",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/05/15/3086219/6e82a320-5226-482e-af9c-533857247cce.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Arkası Baskılı" src="https://ktnimg2.mncdn.com/cms/2025/03/24/0e617ea4-13b5-46d6-8949-dd44a7d11ee2.jpg"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-tisort-beyaz-4067274/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/05/15/3086219/6e82a320-5226-482e-af9c-533857247cce_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/05/15/3086219/6e82a320-5226-482e-af9c-533857247cce_size708x930.jpg" alt=" Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-tisort-beyaz-4067274/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/05/15/3086219/98080855-ea79-4418-95d8-d00186734bc6_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/05/15/3086219/98080855-ea79-4418-95d8-d00186734bc6_size708x930.jpg" alt=" Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Tişört",
        "item_id": "8684757749713",
        "price":  399.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "BEYAZ|M",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 21 ,
        "quantity":1,
        "base_code": "5SAM10439HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1395190">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="000" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-tisort-beyaz-4067274/" target="_blank" class="js-product-link product-link"> Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10439HK" link-url="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-tisort-beyaz-4067274/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">399,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button=""></div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-tisort-beyaz-4067274/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/05/15/3086219/6e82a320-5226-482e-af9c-533857247cce_size680x892_cropCenter.jpg" aria-label="Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Tişört 000 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Tişört-000" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/05/15/3086219/385753f1-4cde-42c5-9b0f-77e52ee63db3_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"></div>
          <pz-mobile-quickshop url="/kisa-kollu-pamuklu-regular-fit-bisiklet-yaka-arkasi-baskili-tisort-beyaz-4067274/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="23" class="js-product-wrapper product-item  " data-sku="8684756699484" data-pk="1373609" data-url="/bisiklet-yaka-arkasi-baskili-pamuklu-kisa-kollu-oversize-tisort-beyaz-4053676/" data-price="449.99" data-key="integration_color_desc" data-value="000" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684756699484",
      "name": "Bisiklet Yaka Arkası Baskılı Pamuklu Kısa Kollu Oversize Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS"],
      "currency": "TRY",
      "unit_price":  449.99 ,
      "unit_sale_price":  449.99 ,
      "url": "https://www.koton.com/bisiklet-yaka-arkasi-baskili-pamuklu-kisa-kollu-oversize-tisort-beyaz-4053676/",
      "stock": 1,
      "color": "BEYAZ",
      "size": "S",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/03/23/3064734/5faef0bf-fb23-43a6-a53e-fa8ca94ab30c.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Arkası Baskılı" src="https://ktnimg2.mncdn.com/cms/2025/03/24/0e617ea4-13b5-46d6-8949-dd44a7d11ee2.jpg"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/bisiklet-yaka-arkasi-baskili-pamuklu-kisa-kollu-oversize-tisort-beyaz-4053676/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/03/23/3064734/5faef0bf-fb23-43a6-a53e-fa8ca94ab30c_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/03/23/3064734/5faef0bf-fb23-43a6-a53e-fa8ca94ab30c_size708x930.jpg" alt=" Bisiklet Yaka Arkası Baskılı Pamuklu Kısa Kollu Oversize Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/bisiklet-yaka-arkasi-baskili-pamuklu-kisa-kollu-oversize-tisort-beyaz-4053676/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/03/23/3065643/5e778892-cad3-4b75-84ae-66022d93942e_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/03/23/3065643/5e778892-cad3-4b75-84ae-66022d93942e_size708x930.jpg" alt=" Bisiklet Yaka Arkası Baskılı Pamuklu Kısa Kollu Oversize Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Bisiklet Yaka Arkası Baskılı Pamuklu Kısa Kollu Oversize Tişört",
        "item_id": "8684756699484",
        "price":  449.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "BEYAZ|S",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 22 ,
        "quantity":1,
        "base_code": "5SAM10383HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1373609">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="000" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Bisiklet Yaka Arkası Baskılı Pamuklu Kısa Kollu Oversize Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/bisiklet-yaka-arkasi-baskili-pamuklu-kisa-kollu-oversize-tisort-beyaz-4053676/" target="_blank" class="js-product-link product-link"> Bisiklet Yaka Arkası Baskılı Pamuklu Kısa Kollu Oversize Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10383HK" link-url="/bisiklet-yaka-arkasi-baskili-pamuklu-kisa-kollu-oversize-tisort-beyaz-4053676/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">449,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button="">+(1) Renk</div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/bisiklet-yaka-arkasi-baskili-pamuklu-kisa-kollu-oversize-tisort-beyaz-4053676/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/03/23/3064734/5faef0bf-fb23-43a6-a53e-fa8ca94ab30c_size680x892_cropCenter.jpg" aria-label="Bisiklet Yaka Arkası Baskılı Pamuklu Kısa Kollu Oversize Tişört 000 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Bisiklet Yaka Arkası Baskılı Pamuklu Kısa Kollu Oversize Tişört-000" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/03/23/3065643/bbbfddb4-f0f5-407d-a681-7fe431c646a9_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/bisiklet-yaka-arkasi-baskili-pamuklu-kisa-kollu-oversize-tisort-siyah-4053677/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/03/24/3064666/04a9877b-1bc4-4925-baa7-a69372b5e827_size680x892_cropCenter.jpg" aria-label="Bisiklet Yaka Arkası Baskılı Pamuklu Kısa Kollu Oversize Tişört 999 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Bisiklet Yaka Arkası Baskılı Pamuklu Kısa Kollu Oversize Tişört-999" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/03/24/3064666/1551a253-754d-4811-ad27-70c817538ee1_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"><span>1.000 TL ve ÜZERİNE %15 + KTN25 KODU İLE EK %25 İNDİRİM</span></div>
          <pz-mobile-quickshop url="/bisiklet-yaka-arkasi-baskili-pamuklu-kisa-kollu-oversize-tisort-beyaz-4053676/"></pz-mobile-quickshop>
      </div>
    </div></div>

            
              
                
              
            


  





  



<div data-layout="2" data-index="24" class="js-product-wrapper product-item  " data-sku="8684756077657" data-pk="1377983" data-url="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-lacivert-4044753-1/" data-price="699.99" data-key="integration_color_desc" data-value="725" data-render="true">
  <div class="js-insider-product" style="display: none !important; visibility: hidden !important;">
    {
      "id": "8684756077657",
      "name": "Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört",
      "taxonomy":["MENSWEAR","CASUAL","MEN","JERSEY","TSHIRT SS BSC"],
      "currency": "TRY",
      "unit_price":  699.99 ,
      "unit_sale_price":  699.99 ,
      "url": "https://www.koton.com/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-lacivert-4044753-1/",
      "stock": 1,
      "color": "LACİVERT",
      "size": "XXL",
      "product_image_url": "https://ktnimg2.mncdn.com/products/2025/05/08/3070440/228dcadd-f587-4781-986e-f14432d696d2.jpg"
      
    }
  </div>

  
  
  
  
    
  

  <div class="product-item__body"><div class="product-item__badges-container"><img loading="lazy" width="80" height="20" alt="Çok Satan" src="https://ktnimg2.mncdn.com/cms/2023/12/07/4fc523ee-7f99-46fd-a081-fd2fd46f99fd.png"></div><div class="product-item__body-image"><pz-carousel class="images js-images pz-carousel -direction-horizontal" pagination="" data-render="true">
                
  <a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-lacivert-4044753-1/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/05/08/3070440/228dcadd-f587-4781-986e-f14432d696d2_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/05/08/3070440/228dcadd-f587-4781-986e-f14432d696d2_size708x930.jpg" alt=" Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              
                
  <a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-lacivert-4044753-1/" class="product-link js-product-link" aria-label="Go to Product" target="_blank"> 
    <pz-image-placeholder lazy="" hidden="" slider="" class="pz-image-placeholder block relative">
      <picture>
        <source media="(max-width: 768px)" data-srcset="https://ktnimg2.mncdn.com/products/2025/03/28/3070440/a2b1d21d-f1f9-4cb3-bce2-12a87afbb322_size354x464.jpg">
        <img width="708" height="930" data-src="https://ktnimg2.mncdn.com/products/2025/03/28/3070440/a2b1d21d-f1f9-4cb3-bce2-12a87afbb322_size708x930.jpg" alt=" Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört">
      </picture>
    </pz-image-placeholder>
  </a>
              </pz-carousel></div><div class="js-ga4-product-item -active" style="display: none !important; visibility: hidden !important;">
      {
        "item_name": "Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört",
        "item_id": "8684756077657",
        "price":  699.99 ,
        "item_brand": "Koton",
        "item_category":"MENSWEAR",
        "item_category2":"CASUAL",
        "item_category3":"MEN",
        "item_category4":"JERSEY",
        "item_category5":"TSHIRT SS BSC",
        "item_season":"2025 SPRING/SUMMER",
        "item_variant": "LACİVERT|XXL",
        "item_list_name":"Tişört",
        "item_list_id":"576",
        "index": 23 ,
        "quantity":1,
        "base_code": "5SAM10371HK"
      }
    </div>
      <div class="product-item__body-quicklook js-open-quicklook" data-pk="1377983">
        <i class="fas fa-plus"></i>
      </div>
      <div class="product-item__body-favourite icon-wrapper">
    <i class="js-add-to-favourites
     pz-icon-heart " data-url="/users/auth/?next=/erkek-tisort/">
    </i>
  <i class="fill-icon pz-icon-heart-fill"></i>
  </div>

      

      <div class="product-item__body-basket-area -mobile" data-key="integration_color_desc" data-value="725" mobile-quickshop-open-button="">
        
        <img loading="lazy" width="29" height="39" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/fill-basket.svg" alt="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört Sepete Ekle">
      
      </div>

      <div class="action js-action">
      <div class="action__container">
        <div class="action__trigger">
          <div class="action__loading js-action-loading" hidden="">
          <img width="74" loading="lazy" height="75" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo-pamuk.svg" class="logo-cotton" alt="www.koton.com">
          </div>
        </div>
        <div class="action__content js-action-content">
        </div>
      </div>
    </div></div><div class="product-item__info">
      <div class="product-item__info-box"><h2 class="product-item__info-name">
            <a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-lacivert-4044753-1/" target="_blank" class="js-product-link product-link"> Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört </a>
          </h2><div class="product-item__jetreview-stars">
          <jetreview widget-type="inline" content-type="Product" content-channel="all" location-code="KTN-01" product-code="5SAM10371HK" link-url="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-lacivert-4044753-1/">
        </jetreview></div>
        <div class="product-item__info-selling"><div class="product-item__info-price"><pz-price class="-actuel " rendered="true">699,99 TL</pz-price></div></div><div class="product-item__info-color-variants -mobile" mobile-quickshop-open-button="">+(3) Renk</div>
          <div class="product-item__info-color-variants js-product-color-carousel -desktop">
            <pz-carousel class="color-slider pz-carousel -direction-horizontal"><a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-ekru-4044178-3/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/03/28/3070101/9b05b999-4301-4537-bd0a-1e1bb98e9385_size680x892_cropCenter.jpg" aria-label="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört 010 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört-010" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/03/28/3070109/bd7851c1-1314-43a3-9cbe-1ff3c458e852_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-gri-4044179-1/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/04/02/3070145/aef88e67-6de2-4dc4-9924-4dee89657cdd_size680x892_cropCenter.jpg" aria-label="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört 031 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört-031" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/04/02/3070145/dbdd5319-75a3-4d4e-a5d9-7f289f57303e_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-lacivert-4044753-1/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/05/08/3070440/228dcadd-f587-4781-986e-f14432d696d2_size680x892_cropCenter.jpg" aria-label="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört 725 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört-725" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/03/20/3070440/6617c2e2-9dcd-4e6d-a3ad-810530049f0f_size24x24_cropCenter.jpg">
                    </div>
                  </a><a href="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-yesil-4044754-2/" class="product-item__info-color-variants--item js-product-color-item" data-image="https://ktnimg2.mncdn.com/products/2025/03/28/3070138/2467be1a-bb1f-4abd-b88d-8be487f0e9cd_size680x892_cropCenter.jpg" aria-label="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört 786 direct">
                    <div class="product-item__info-color-variants--hex-code">
                      <img alt="Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört-786" loading="lazy" src="https://ktnimg2.mncdn.com/products/2025/03/28/3070138/5d00e4aa-1e8c-47e5-b313-91af41df30af_size24x24_cropCenter.jpg">
                    </div>
                  </a></pz-carousel>
          </div><div class="product-item__info-campaign"><span>1.000 TL ve ÜZERİNE %20 + KTN25 KODU İLE EK %25 İNDİRİM</span></div>
          <pz-mobile-quickshop url="/pamuklu-regular-fit-biyeli-kisa-kollu-bisiklet-yaka-erkek-tisort-lacivert-4044753-1/"></pz-mobile-quickshop>
      </div>
    </div></div></div>
        <div class="js-list-products-loading list__products-loading" hidden="">
          <pz-loader class="pz-loader -size-lg">
      <div class="pz-loader__body"><div><svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#000"><g transform="translate(1 1)" stroke-width="2" fill="none" fill-rule="evenodd"><circle stroke-opacity=".1" cx="18" cy="18" r="18"></circle><path d="M36 18c0-9.94-8.06-18-18-18"><animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite"></animateTransform></path></g></svg></div></div>
    </pz-loader>
        </div>
        <div class="list__products-footer js-list-products-footer">
          <div class="hidden js-page-count">63</div>
          <div class="hidden js-current-page">1</div>
          <div class="hidden js-page-size">24</div>
          <div>
            <pz-button page="2" class="js-loadmore-products list__products-loadmore pz-button -appearance-filled">
      
      
      <span class="pz-button__text">Daha Fazla Ürün Göster</span>
    </pz-button>
          </div>
          <div class="js-products-pagination-container list__products-pagination">
            <pz-pagination class="js-products-pagination pz-pagination -type-numeric" page="1" total="1499" per-page="24" list-page="true" spreadpagination="true"><ol class="pz-pagination__list"><li class="pz-pagination__list-item -selected">
            <a class="pz-pagination-link" href="/erkek-tisort/?page=1" data-page="1">
            1
            </a>
        </li><li class="pz-pagination__list-item">
            <a class="pz-pagination-link" href="/erkek-tisort/?page=2" data-page="2">
            2
            </a>
        </li><li class="pz-pagination__list-item">
            <a class="pz-pagination-link" href="/erkek-tisort/?page=3" data-page="3">
            3
            </a>
        </li><li class="pz-pagination__list-item -separator">
            <a class="pz-pagination-link" href="#" data-page="#">
            ...
            </a>
        </li><li class="pz-pagination__list-item">
            <a class="pz-pagination-link" href="/erkek-tisort/?page=63" data-page="63">
            63
            </a>
        </li><li class="pz-pagination__list-item -navigation">
            <a class="pz-pagination-link" href="/erkek-tisort/?page=2" data-page="2">
            Sonraki
            </a>
        </li></ol></pz-pagination>
          </div>
       </div></div>
  </div><div class="category-text js-readmore-container -collapsed"><div class="category-text__title">
          Erkek Tişört Modelleri
        </div><div class="category-text__content js-readmore-content">
          <div class="category-text__columns"><div class="category-text__column"><p style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 11px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><strong>Erkek tişört modelleri</strong><span>&nbsp;</span>arasında olan<span>&nbsp;</span><strong>oversize tişörtler, baskılı tişörtler, basic tişörtler ve polo tişörtler</strong><span>&nbsp;</span>her zaman kullanılabilirler ve her tarza uygun kombinde kolayca tercih edilebilirler. Her mevsimin en çok tercih edilen parçaları arasında yer alan<span>&nbsp;</span><strong>Koton erkek tişörtleri</strong>, her beklentiye uygun ve zengin bir yelpaze içerisinde yer alıyor. Sade ve<span>&nbsp;</span><strong>basic erkek tişörtleri</strong><span>&nbsp;</span>kadar, renkli ve<span>&nbsp;</span><strong>baskılı erkek tişört modelleri</strong><span>&nbsp;</span>de üreten Koton, koleksiyonlarında tüm stillere ve giyim zevklerine hitap edebilen,<span>&nbsp;</span><strong>kaliteli erkek tişörlerine</strong><span>&nbsp;</span>ve şık ürünlere yer veriyor. Aynı zamanda farklı kesim seçenekleri ile<span>&nbsp;</span><strong>oversize erkek tişörtü</strong><span>&nbsp;</span>arayanlar da slim fit erkek tişörtü arayanlar da Koton’da kendine uygun modeller bulabiliyor. Günün her saati rahatlıkla giyeceğiniz ve şık kombinler yaratabileceğiniz<span>&nbsp;</span><strong>erkek tişörtler</strong>i Koton kalitesiyle sizleri bekliyor.</p><p style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 11px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><br></p><h2 style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><strong>Oversize Erkek Tişörtleri</strong></h2><p style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 11px;"><span style="font-size: 11px;">Son yılların yükselen trendlerinden olan</span><span style="font-size: 11px;">&nbsp;</span><strong style="font-size: 11px;">oversize tişört erkek</strong><span style="font-size: 11px;">&nbsp;giyimde de sevilerek tercih ediliyor. Hem günlük kullanımda bir</span><span style="font-size: 11px;">&nbsp;</span><u style="font-size: 11px;"><a href="https://www.koton.com/erkek-kot-pantolon/" data-mce-href="https://www.koton.com/erkek-kot-pantolon/" style="" target="_blank">kot pantolon</a>&nbsp;</u><span style="font-size: 11px;">modelinin üzerine hem de chino pantolonlar ile rahatlıkla kombinlenebilen&nbsp;</span><strong style="font-size: 11px;">erkek tişörtleri</strong><span style="font-size: 11px;">, yaz döneminde</span><span style="font-size: 11px;">&nbsp;</span><a href="https://www.koton.com/erkek-sort-bermuda/" data-mce-href="https://www.koton.com/erkek-sort-bermuda/" style="font-size: 11px;" target="_blank"><u>şort</u></a><span style="font-size: 11px;"><u>&nbsp;</u><span style="font-size: 11px;">tasarımlarının üzerinde de günlük şık bir görünüm yakalanmasını sağlıyor. Aynı zamanda mevsim geçişlerinde de kot ceketin içinde ya da bir oduncu gömleğin içinde de</span></span><span style="font-size: 11px;">&nbsp;</span><strong style="font-size: 11px;">erkek tişörtleri</strong><span style="font-size: 11px;">&nbsp;çok tarz bir görünüm sunuyor.</span></p><p style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 11px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><br></p><h2 style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><strong>Erkek Polo Yaka Tişörtleri</strong></h2><p style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 11px;"><span style="font-size: 11px;">Farklı yaka seçenekleri ile her tarza hitap eden modellere sahip olan</span><span style="font-size: 11px;">&nbsp;</span><strong style="font-size: 11px;">erkek tişörtleri</strong><span style="font-size: 11px;">&nbsp;geniş renk ve model skalası sayesinde, Koton pantolonlar ve şortlar ile kolayca kombin edilebiliyor. Oversize, normal ve dar kesim olarak farklı vücut tiplerine hitap eden</span><strong style="font-size: 11px;"><span>&nbsp;</span>erkek tişört modelleri</strong><span style="font-size: 11px;">&nbsp;şıklık, kalite ve uygun fiyat üçlüsünü bir araya getiriyor. Zengin model alternatifleri arasından kendi tarzınıza en uygun tercih edeceğiniz</span><span style="font-size: 11px;">&nbsp;</span><strong style="font-size: 11px;">erkek tişörtleri</strong><span style="font-size: 11px;">&nbsp;arasında</span><span style="font-size: 11px;">&nbsp;</span><strong style="font-size: 11px;">polo yaka tişörtler</strong><span style="font-size: 11px;">&nbsp;oldukça fazla tercih edilmektedir. Gömlek yakasına benzer görünümü ile hem günlük giyimde hem de ofiste kolayca</span><span style="font-size: 11px;">&nbsp;</span><u><a href="https://www.koton.com/erkek-polo-tisort/" data-mce-href="https://www.koton.com/tr/erkek/polo-yaka-t-shirt/c/M01-C01-G199" style="" target="_blank">polo yaka erkek tişörtleri</a>ni </u><span style="font-size: 11px;">tercih edebilirsiniz. Gömlek giymek istemediğiniz durumlar ya da sıcak havalarda kurtarıcı olan</span><span style="font-size: 11px;">&nbsp;</span><strong style="font-size: 11px;">erkek polo yaka tişörtleri</strong><span style="font-size: 11px;">ni ceketlerin içinde de kolaylıkla tercih edebilirsiniz. Günlük şık bir görünüm yakalamak isterseniz chino bir pantolonun üzerine kombinleyeceğiniz</span><span style="font-size: 11px;">&nbsp;</span><strong style="font-size: 11px;">erkek polo tişört</strong><span style="font-size: 11px;">&nbsp;harika seçim olacaktır!</span></p><p style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 11px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><br></p><h2 style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><strong>Kısa Kollu ve Uzun Kollu Basic Erkek Tişörtleri</strong></h2><p style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 11px;"><span style="font-size: 11px;">Sade ve rahat görünümleri ile her kombine, tarza uyum sağlayan</span><span style="font-size: 11px;">&nbsp;</span><u><a href="https://www.koton.com/beyaz-tisort/" data-mce-href="https://www.koton.com/beyaz-tisort/" style="" target="_blank">beyaz tişört</a>&nbsp;</u><span style="font-size: 11px;">tasarımları ve &nbsp;</span><strong style="font-size: 11px;">basic erkek tişört modelleri</strong><span style="font-size: 11px;">&nbsp;sizleri bekliyor. Uzun ve kısa kollu olarak her mevsim kullanılabilen tasarımları ile en çok tercih edilen üst giyim modelleri olan</span><span style="font-size: 11px;">&nbsp;</span><strong style="font-size: 11px;">erkek tişörtler</strong><span style="font-size: 11px;">&nbsp;eşofman altı, jean pantolon ve şortlarla kolaylıkla kombinlenebiliyor.</span><span style="font-size: 11px;">&nbsp;</span><strong style="font-size: 11px;">Erkek beyaz tişört</strong><span style="font-size: 11px;">, son derece basic görünümü ile hem gömleklerin içinde hem de her tarz ve kumaştan pantolonun üzerinde harika olacaktır. Hem şık hem rahat olan tasarımları ile beğenileri toplayan</span><span style="font-size: 11px;">&nbsp;</span><strong style="font-size: 11px;">Koton basic erkek tişört modelleri</strong><span style="font-size: 11px;">&nbsp;geniş renk yelpazesiyle beğeninize sunuluyor. Yaz döneminde kısa kollu tişörtler vazgeçilmez kıyafetler olurken, bahar aylarında</span><span style="font-size: 11px;">&nbsp;</span><strong style="font-size: 11px;">uzun kollu erkek tişörtleri</strong><span style="font-size: 11px;">&nbsp;de favori seçimler arasına giriyor.</span></p><p style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 11px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><br></p><h3 style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><strong>Baskılı ve Desenli Erkek Tişörtleri</strong></h3><p style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 11px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">Trendleri takip edenler ve farklı görünümlerden hoşlananlar için özenle hazırlanan desenli ve<span>&nbsp;</span><strong>baskılı erkek tişört modelleri</strong>, girdiğiniz ortamlarda zahmetsiz şıklıkla dikkatleri üzerinize toplamanızı sağlıyor. Jean ya da canvas pantolonlara, şortlardan eşofman altlarına kadar her tarz alt giyim ürünü ile kolayca kombinlenebilen<span>&nbsp;</span><strong>erkek tişörtler</strong><span>&nbsp;</span>özgün tasarımları ile ilgi çekiyor. Yaprak ve çiçek motiflerinin yanı sıra tropikal desenlere de sahip olan geniş ürün yelpazesi ile<span>&nbsp;</span><strong>baskılı erkek tişörtleri</strong><span>&nbsp;</span>her tarza hitap ediyor. En beğenilen müzik gruplarından, ünlü filmlere kadar farklı baskıları ile beğenileri toplayan<span>&nbsp;</span><strong>lisanslı erkek tişörtler</strong><span>&nbsp;</span>ise popüler kültürle modayı buluşuyor. Siz de tarzınıza en uygun<span>&nbsp;</span><strong>erkek tişörtlerini</strong><span>&nbsp;</span>keşfetmek için hemen sayfamıza göz atın!</p><p style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 11px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">&nbsp;</p><p style="color: rgb(0, 0, 0); font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 11px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">İlgili Sayfalar: ▪&nbsp;<a href="https://www.koton.com/mavi-tisort/" target="_blank"><u>Mavi Tişört</u></a>&nbsp;▪&nbsp;<a href="https://www.koton.com/kirmizi-tisort/" target="_blank"><u>Kırmızı Tişört</u></a> ▪&nbsp;<a href="https://www.koton.com/yesil-tisort/" target="_blank"><u>Yeşil Tişört</u></a>&nbsp;▪&nbsp;<a href="https://www.koton.com/siyah-tisort/" target="_blank"><u>Siyah Tişört</u></a><br></p></div></div>
        </div><div class="category-text__readmore__container js-readmore-text-container">
        <div class="category-text__readmore js-readmore-toggle -positive">
          <div class="category-text__readmore-icon">
            <i class="icon"></i>
          </div>
          <div class="category-text__readmore-text">
            DAHA FAZLA GÖSTER
          </div>
        </div>

        <div class="category-text__readmore js-readmore-toggle -negative">
          <div class="category-text__readmore-icon">
            <i class="icon"></i>
          </div>
          <div class="category-text__readmore-text">
            DAHA AZ GÖSTER
          </div>
        </div>
      </div>
    </div></section>

<div class="analytics-data" style="display: none !important; visibility: hidden !important;">
  {
    "type": "productListViewed",
    "payload": [
      
        {
        "id": "5SAM10176HK057L",
        "name": "Kısa Kollu Pamuklu Bisiklet Yaka Arkası Baskılı Tişört",
        "price": 499.99,
        "brand": "KOTON",
        "variant": "L",
        "category": "",
        "position": 1,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/05/22/3087141/15efd11a-cf4e-4871-bc15-1802ee0f7536.jpg",
        "dimension10": "5SAM10176HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10172HK000S",
        "name": "Arkası Baskılı Kısa Kollu Pamuklu Bisiklet Yaka Tişört",
        "price": 499.99,
        "brand": "KOTON",
        "variant": "S",
        "category": "",
        "position": 2,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/06/27/3065791/48ca4588-453d-40f1-99e6-73dbb8df03ac.jpg",
        "dimension10": "5SAM10172HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10371HK010XL",
        "name": "Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört",
        "price": 749.99,
        "brand": "KOTON",
        "variant": "XL",
        "category": "",
        "position": 3,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/03/28/3070101/9b05b999-4301-4537-bd0a-1e1bb98e9385.jpg",
        "dimension10": "5SAM10371HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10344HK725L",
        "name": "Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört",
        "price": 399.99,
        "brand": "KOTON",
        "variant": "L",
        "category": "",
        "position": 4,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/01/07/3039517/5739d497-4bea-4027-98fe-b6da8427cb6e.jpg",
        "dimension10": "5SAM10344HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10344HK000XL",
        "name": "Bisiklet Yaka Kısa Kollu Pamuklu Biyeli Slim Fit Tişört",
        "price": 349.99,
        "brand": "KOTON",
        "variant": "XL",
        "category": "",
        "position": 5,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/01/14/3043571/699c0b32-bd3a-4606-b9bb-24676fb5af72.jpg",
        "dimension10": "5SAM10344HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10366HKMIXS",
        "name": "Pamuklu Regular Fit Kısa Kollu Bisiklet Yaka Basic 5\u0027li Erkek Tişört Seti",
        "price": 1299.99,
        "brand": "KOTON",
        "variant": "S",
        "category": "",
        "position": 6,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/04/22/3059577/cc762684-86f4-465e-b89f-f8094ee846c6.jpg",
        "dimension10": "5SAM10366HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10364HKMIXM",
        "name": "Bisiklet Yaka Pamuklu Kısa Kollu Regular Fit Basic 3\u0027lü Erkek Tişört Seti",
        "price": 779.99,
        "brand": "KOTON",
        "variant": "M",
        "category": "",
        "position": 7,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/02/27/3062056/6101b2ef-b4e1-472f-912e-8c97313092fc.jpg",
        "dimension10": "5SAM10364HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10363HKMIXL",
        "name": "V Yaka Pamuklu Slim Fit Basic 3\u0027lü Erkek Tişört Seti",
        "price": 899.99,
        "brand": "KOTON",
        "variant": "L",
        "category": "",
        "position": 8,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/02/21/3059582/db9a7a56-a693-4abd-a68e-2ddddeaba292.jpg",
        "dimension10": "5SAM10363HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10365HKMIXS",
        "name": "Kısa Kollu Regular Fit Bisiklet Yaka Pamuklu 3\u0027lü Basic Tişört Seti",
        "price": 779.99,
        "brand": "KOTON",
        "variant": "S",
        "category": "",
        "position": 9,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/02/20/3052195/4e6d4cef-91c9-4c8c-9966-4875a5ee640c.jpg",
        "dimension10": "5SAM10365HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM70063HT545S",
        "name": "Kısa Kollu V Yaka Ajurlu Triko Tişört",
        "price": 1299.99,
        "brand": "KOTON",
        "variant": "S",
        "category": "",
        "position": 10,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/06/25/3078024/8aeed735-a379-42a9-9e2b-0fb73f85e1e5.jpg",
        "dimension10": "5SAM70063HT",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10114MK151L",
        "name": "Pamuklu Kısa Kollu Dokulu Regular Fit Polo Yaka Tişört",
        "price": 799.99,
        "brand": "KOTON",
        "variant": "L",
        "category": "",
        "position": 11,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/06/25/3081244/960b3819-508a-4656-8301-68dec9cc7fdf.jpg",
        "dimension10": "5SAM10114MK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10015MK467L",
        "name": "Slim Fit Kısa Kollu Pike Kumaş Pamuklu Polo Yaka Tişört",
        "price": 799.99,
        "brand": "KOTON",
        "variant": "L",
        "category": "",
        "position": 12,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/06/13/3035506/07d54f9a-80aa-49d2-9707-4d9fe3b07377.jpg",
        "dimension10": "5SAM10015MK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10456HK457XXL",
        "name": "Kısa Kollu Regular Fit Pamuklu Bisiklet Yaka Baskılı Tişört",
        "price": 499.99,
        "brand": "KOTON",
        "variant": "XXL",
        "category": "",
        "position": 13,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/05/26/3089785/dd92c17e-6ae8-432e-a127-d509577fcb57.jpg",
        "dimension10": "5SAM10456HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10459HK050M",
        "name": "Kısa Kollu Bisiklet Yaka Pamuklu Oversize Arkası Baskılı Tişört",
        "price": 599.99,
        "brand": "KOTON",
        "variant": "M",
        "category": "",
        "position": 14,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/06/16/3094466/c6eda60f-3603-4d87-80aa-ea0d3d1a06c8.jpg",
        "dimension10": "5SAM10459HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10134HK000L",
        "name": "Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört",
        "price": 499.99,
        "brand": "KOTON",
        "variant": "L",
        "category": "",
        "position": 15,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/02/26/3060733/d763c42b-096e-43e6-8519-eec03078b4f4.jpg",
        "dimension10": "5SAM10134HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10127HK152S",
        "name": "Arkası Baskılı Kısa Kollu Viskon Karışımlı Bisiklet Yaka Oversize Tişört",
        "price": 599.99,
        "brand": "KOTON",
        "variant": "S",
        "category": "",
        "position": 16,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2024/11/27/3020720/01a32699-0432-4178-9629-a9eb4b1d800d.jpg",
        "dimension10": "5SAM10127HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10425HK050XL",
        "name": "Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Lisanslı Superman Tişört",
        "price": 499.99,
        "brand": "KOTON",
        "variant": "XL",
        "category": "",
        "position": 17,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/06/16/3096713/f7853678-c17c-4b9d-b0f2-f8aad52d9c8d.jpg",
        "dimension10": "5SAM10425HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10465HK024XL",
        "name": "Oversize Pamuklu Kısa Kollu Lisanslı Snoopy Baskılı Tişört",
        "price": 599.99,
        "brand": "KOTON",
        "variant": "XL",
        "category": "",
        "position": 18,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/06/17/3095413/3f34b47f-d877-43e2-9289-518a9bf40567.jpg",
        "dimension10": "5SAM10465HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10430HK000M",
        "name": "Pamuklu Baskılı Kısa Reglan Kollu Bisiklet Yaka Renk Bloklu Oversize Lisanslı Yale Tişört",
        "price": 799.99,
        "brand": "KOTON",
        "variant": "M",
        "category": "",
        "position": 19,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/05/15/3086211/2c12e557-eaf9-4e79-9fe2-5c3a1a097c96.jpg",
        "dimension10": "5SAM10430HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10438HK000XL",
        "name": "Kısa Kollu Pamuklu Regular Fit Şerit Detaylı Bisiklet Yaka Baskılı Lisanslı Harvard Tişört",
        "price": 599.99,
        "brand": "KOTON",
        "variant": "XL",
        "category": "",
        "position": 20,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/05/16/3086312/d5d4f132-d75e-483a-a29a-23b73c756728.jpg",
        "dimension10": "5SAM10438HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10384HK031XL",
        "name": "Arkası Baskılı Pamuklu Kısa Kollu Bisiklet Yaka Oversize Tişört",
        "price": 449.99,
        "brand": "KOTON",
        "variant": "XL",
        "category": "",
        "position": 21,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/03/28/3070261/d5aa478d-9b30-4269-96bd-72a44a73445b.jpg",
        "dimension10": "5SAM10384HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10439HK000M",
        "name": "Kısa Kollu Pamuklu Regular Fit Bisiklet Yaka Arkası Baskılı Tişört",
        "price": 399.99,
        "brand": "KOTON",
        "variant": "M",
        "category": "",
        "position": 22,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/05/15/3086219/6e82a320-5226-482e-af9c-533857247cce.jpg",
        "dimension10": "5SAM10439HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10383HK000S",
        "name": "Bisiklet Yaka Arkası Baskılı Pamuklu Kısa Kollu Oversize Tişört",
        "price": 449.99,
        "brand": "KOTON",
        "variant": "S",
        "category": "",
        "position": 23,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/03/23/3064734/5faef0bf-fb23-43a6-a53e-fa8ca94ab30c.jpg",
        "dimension10": "5SAM10383HK",
        "list": "erkek-tisort"
        },
      
        {
        "id": "5SAM10371HK725XXL",
        "name": "Pamuklu Regular Fit Biyeli Kısa Kollu Bisiklet Yaka Erkek Tişört",
        "price": 699.99,
        "brand": "KOTON",
        "variant": "XXL",
        "category": "",
        "position": 24,
        "dimension4":  "Guest" ,
        "dimension6": "List",
        "dimension9": "https://ktnimg2.mncdn.com/products/2025/05/08/3070440/228dcadd-f587-4781-986e-f14432d696d2.jpg",
        "dimension10": "5SAM10371HK",
        "list": "erkek-tisort"
        }
      
    ]
  }
</div><footer class="footer ">


<div class="footer-info">
  <pz-carousel per-view="7" step="1" class="pz-carousel -direction-horizontal">
    <pz-breakpoint pagination="" size="1200" per-view="5" step="5" space="1.5rem"></pz-breakpoint>
    <pz-breakpoint pagination="" size="1024" per-view="4" step="4" space="1.5rem"></pz-breakpoint>
    <pz-breakpoint pagination="" size="768" per-view="3" step="3" space="1rem"></pz-breakpoint>
    <pz-breakpoint pagination="" size="500" per-view="2" step="2" space="1rem"></pz-breakpoint><div class="footer-info__item">
      <div class="footer-info__first"><pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
          <img alt="Koton Club" data-src="https://ktnimg2.mncdn.com/cms/2024/03/12/aecb3f53-77eb-4ab9-b04b-318a8b82aba0.jpg" data-width="25" data-height="25">
        </pz-image-placeholder></div>
      <div class="footer-info__second"><div class="footer-info__title"><p>Koton Club</p></div></div>
    </div><div class="footer-info__item">
      <div class="footer-info__first"><pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
          <img alt="Mağazadan Gel-Al" data-src="https://ktnimg2.mncdn.com/cms/2024/03/12/0be33e84-e245-465d-9290-8873db4a12ca.jpg" data-width="25" data-height="25">
        </pz-image-placeholder></div>
      <div class="footer-info__second"><div class="footer-info__title"><p>Mağazadan <strong>Gel-Al</strong></p></div></div>
    </div><div class="footer-info__item">
      <div class="footer-info__first"><pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
          <img alt="Mağazada Değişim &amp;amp; İade" data-src="https://ktnimg2.mncdn.com/cms/2024/03/12/8f302e82-5736-4ff8-8362-6e1fd0c5ead3.jpg" data-width="25" data-height="25">
        </pz-image-placeholder></div>
      <div class="footer-info__second"><div class="footer-info__title"><p>Mağazada Değişim &amp; İade</p></div></div>
    </div><div class="footer-info__item">
      <div class="footer-info__first"><pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
          <img alt="Kapıda Ödeme" data-src="https://ktnimg2.mncdn.com/cms/2024/03/12/103585d5-5f51-4a65-9aff-8a1ab00e92ea.jpg" data-width="25" data-height="25">
        </pz-image-placeholder></div>
      <div class="footer-info__second"><div class="footer-info__title"><p>Kapıda Ödeme</p></div></div>
    </div><div class="footer-info__item">
      <div class="footer-info__first"><pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
          <img alt="Bi Tıkla Kapında" data-src="https://ktnimg2.mncdn.com/cms/2024/03/12/6dedfb8e-3bc2-4f3b-871d-3c7da6328213.jpg" data-width="25" data-height="25">
        </pz-image-placeholder></div>
      <div class="footer-info__second"><div class="footer-info__title"><p>Bi Tıkla Kapında</p></div></div>
    </div><div class="footer-info__item">
      <div class="footer-info__first"><pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
          <img alt="Güvenli Alışveriş" data-src="https://ktnimg2.mncdn.com/cms/2024/03/12/00583d8f-e1ca-4630-b441-b07d16141971.jpg" data-width="25" data-height="25">
        </pz-image-placeholder></div>
      <div class="footer-info__second"><div class="footer-info__title"><p>Güvenli Alışveriş</p></div></div>
    </div><div class="footer-info__item">
      <div class="footer-info__first"><pz-image-placeholder lazy="" slider="" class="pz-image-placeholder block relative">
          <img alt="Ücretsiz İade" data-src="https://ktnimg2.mncdn.com/cms/2024/03/12/84786008-e96b-490b-84c9-cdc86a047a10.jpg" data-width="25" data-height="25">
        </pz-image-placeholder></div>
      <div class="footer-info__second"><div class="footer-info__title"><p>Ücretsiz İade</p></div></div>
    </div></pz-carousel>
</div><div class="footer-body">
    <div class="footer-body__box"><div class="footer-subscription">
  <div class="subscription "><h3 class="subscription__title">En güncel moda haberleri için kaydolun</h3><p class="subscription__desc">Herkesten önce kaçırılmaması gereken haberleri alın.<br></p><pz-form class="subscription-form js-subscription-form pz-form" action="/email-subscription/" method="POST"><form><div class="subscription-form__info">
        <div>
          <pz-input type="email" name="email" placeholder="E-posta" class="subscription-form__email js-subscription-input pz-input" v-email="" v-required="">
      <input type="email" class="input pz-form-input" id="pz-form-input-77df" name="email" placeholder="E-posta">
      
    </pz-input>
        </div>

        <pz-button class="-icon-button pz-button -icon-left -appearance-outlined -size-xs" appearance="outlined" type="submit" size="xs" icon="arrow-right">
      <i class="pz-button__icon pz-icon-arrow-right"></i>
      
      
    </pz-button>
      </div>
      <pz-label class="pz-label"><pz-checkbox name="subscribe_contract" class="subscription-form__checkbox pz-checkbox -labeled" v-required="">
      <input type="checkbox" class="checkbox pz-form-input" id="pz-form-input-c1ef8" name="subscribe_contract">
    <label for="pz-form-input-c1ef8" class="label"><p>Kayıt olmakla, Koton ile olan etkileşimlerinizden elde ettiğimiz verileri işleme almamız ve size kişiselleştirilmiş bir içerik sunabilmemiz için <a href="/kisisel-verilerin-korunmasi"><u>Gizlilik Politikasını</u></a> kabul etmiş sayılıyorsunuz.</p>
      </label></pz-checkbox></pz-label>
    </form></pz-form></div>
</div>


<div class="footer-app">
  <div class="footer-app__box">
      <div class="footer-app__title">
        Alışveriş Uygulamamızı İndirin
      </div>
      <div class="footer-app__description">
        Mobil uygulamamızı keşfedin, size özel fırsatları yakalayın!
      </div><ul class="footer-app__items">
        <li class="footer-app__item">
          <a href="https://apps.apple.com/tr/app/koton-giyim-al%C4%B1%C5%9Fveri%C5%9F-sitesi/id1436987707">
            <picture>
              <source srcset="https://ktnimg2.mncdn.com/cms/2024/01/24/cb26549f-bf3b-4e76-acc3-29d0cfba7ec4.jpg" media="(min-width: 768px)">
              <img src="https://ktnimg2.mncdn.com/cms/2024/01/24/293d4612-3232-43f8-bc4f-49fca00deb75.jpg" alt="Apple" class="footer-app__img" loading="lazy">
            </picture>
          </a>
        </li>
        <li class="footer-app__item">
          <a href="https://play.google.com/store/apps/details?id=com.koton.app&amp;hl=en_US">
            <picture>
              <source srcset="https://ktnimg2.mncdn.com/cms/2024/01/24/f8c20eb2-b80d-4748-bfd6-3f5cf5257f6f.jpg" media="(min-width: 768px)">
              <img src="https://ktnimg2.mncdn.com/cms/2024/01/24/91d37598-3b3d-456c-924f-ed659afa94f1.jpg" alt="Google" class="footer-app__img" loading="lazy">
            </picture>
          </a>
        </li>
    </ul>
  </div>
  <div class="footer-app__etbis" hidden=""><div class="footer-etbis"><a href="https://www.eticaret.gov.tr/siteprofil/23A38899E980430F8A61C08EFCBA28C4/wwwkotoncom">
      <img src="https://ktnimg2.mncdn.com/cms/2025/04/30/c958cb93-9f68-44b5-9ab5-aaad44add2c9.jpg" alt="ETBIS" loading="lazy">
    </a></div>
  </div>
</div></div>

    <div class="footer-container">
      <div class="footer-container__menu"><pz-accordion class="footer-menu pz-accordion"><pz-expandable class="pz-expandable" max-breakpoint="1170" title="Kurumsal" data-initial-h-t-m-l="
        &lt;header class=&quot;pz-expandable__header -fake js-pz-expandable-header-fake&quot;&gt;
          &lt;div class=&quot;pz-expandable__title-wrapper&quot;&gt;
          &lt;h3 class=&quot;title&quot;&gt;Kurumsal&lt;/h3&gt;
          &lt;/div&gt;
          &lt;i class=&quot;toggle-icon pz-icon-chevron-down&quot;&gt;&lt;/i&gt;
        &lt;/header&gt;
        &lt;header class=&quot;pz-expandable__header -breakpoint -fake js-pz-expandable-header-fake-breakpoint&quot;&gt;
          &lt;h3 class=&quot;title&quot;&gt;Kurumsal&lt;/h3&gt;
        &lt;/header&gt;
        &lt;ul class=&quot;footer-menu__categories -first&quot;&gt;&lt;li&gt;
              &lt;a href=&quot;https://kurumsal.koton.com.tr/genel-bilgi/&quot; target=&quot;_blank&quot;&gt;
                Hakkımızda
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;
              &lt;a href=&quot;/blog&quot; target=&quot;_blank&quot;&gt;
                Koton Blog
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;
              &lt;a href=&quot;/yasama-saygi-manifestosu&quot; target=&quot;_blank&quot;&gt;
                Yaşama Saygı
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;
              &lt;a href=&quot;/projelerimiz&quot; target=&quot;_blank&quot;&gt;
                Projelerimiz
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;
              &lt;a href=&quot;https://www.kotonkariyerim.com/tr/&quot; target=&quot;_blank&quot;&gt;
                Koton'da Kariyer
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;
              &lt;a href=&quot;/hakkimizdakiler&quot; target=&quot;_blank&quot;&gt;
                Politikalarımız
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;
              &lt;a href=&quot;https://e-sirket.mkk.com.tr/esir/Dashboard.jsp#/sirketbilgileri/11434&quot; target=&quot;_blank&quot;&gt;
                Bilgi Toplumu Hizmetleri
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;
              &lt;a href=&quot;https://kurumsal.koton.com.tr/yatirimci-iliskileri/&quot; target=&quot;_blank&quot;&gt;
                Yatırımcı İlişkileri
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;
              &lt;a href=&quot;/hediyekart&quot; target=&quot;_blank&quot;&gt;
                Kurumsal Hediye Kartı
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;
              &lt;a href=&quot;/iletisim&quot; target=&quot;_blank&quot;&gt;
                İletişim
              &lt;/a&gt;
            &lt;/li&gt;&lt;/ul&gt;
      ">
        <header class="pz-expandable__header js-pz-expandable-header">
          <h3 class="title">Kurumsal</h3>
          
        </header>
        <div class="pz-expandable__body">
          <div class="content">
        
        
        <ul class="footer-menu__categories -first"><li>
              <a href="https://kurumsal.koton.com.tr/genel-bilgi/" target="_blank">
                Hakkımızda
              </a>
            </li><li>
              <a href="/blog" target="_blank">
                Koton Blog
              </a>
            </li><li>
              <a href="/yasama-saygi-manifestosu" target="_blank">
                Yaşama Saygı
              </a>
            </li><li>
              <a href="/projelerimiz" target="_blank">
                Projelerimiz
              </a>
            </li><li>
              <a href="https://www.kotonkariyerim.com/tr/" target="_blank">
                Koton'da Kariyer
              </a>
            </li><li>
              <a href="/hakkimizdakiler" target="_blank">
                Politikalarımız
              </a>
            </li><li>
              <a href="https://e-sirket.mkk.com.tr/esir/Dashboard.jsp#/sirketbilgileri/11434" target="_blank">
                Bilgi Toplumu Hizmetleri
              </a>
            </li><li>
              <a href="https://kurumsal.koton.com.tr/yatirimci-iliskileri/" target="_blank">
                Yatırımcı İlişkileri
              </a>
            </li><li>
              <a href="/hediyekart" target="_blank">
                Kurumsal Hediye Kartı
              </a>
            </li><li>
              <a href="/iletisim" target="_blank">
                İletişim
              </a>
            </li></ul>
      </div>
        </div>
      </pz-expandable><pz-expandable class="pz-expandable" max-breakpoint="1170" title="Yardım" data-initial-h-t-m-l="
        &lt;header class=&quot;pz-expandable__header -fake js-pz-expandable-header-fake&quot;&gt;
          &lt;div class=&quot;pz-expandable__title-wrapper&quot;&gt;
          &lt;h3 class=&quot;title&quot;&gt;Yardım&lt;/h3&gt;
          &lt;/div&gt;
          &lt;i class=&quot;toggle-icon pz-icon-chevron-down&quot;&gt;&lt;/i&gt;
        &lt;/header&gt;
        &lt;header class=&quot;pz-expandable__header -fake -breakpoint js-pz-expandable-header-fake-breakpoint&quot;&gt;
          &lt;h3 class=&quot;title&quot;&gt;Yardım&lt;/h3&gt;
        &lt;/header&gt;
        &lt;ul class=&quot;footer-menu__categories&quot;&gt;&lt;li&gt;&lt;a class=&quot;&quot; href=&quot;/sss&quot; target=&quot;_blank&quot;&gt;
                Sıkça Sorulan Sorular
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;&lt;a class=&quot;&quot; href=&quot;/iptal-iade&quot; target=&quot;_blank&quot;&gt;
                İptal &amp;amp; İade Prosedürü
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;&lt;a class=&quot;&quot; href=&quot;/yardim/&quot; target=&quot;_blank&quot;&gt;
                İade Talebi Oluşturma Rehberi
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;&lt;a class=&quot;&quot; href=&quot;/uyeliksiz-siparis-takibi&quot; target=&quot;_blank&quot;&gt;
                Üyeliksiz Sipariş Takibi
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;&lt;a class=&quot;&quot; href=&quot;/kisisel-verilerin-korunmasi&quot; target=&quot;_blank&quot;&gt;
                Kişisel Verilerin Korunması
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;&lt;a class=&quot;&quot; href=&quot;/whatsapp-kisisel-verilerin-korunmasi-kanunu/&quot;&gt;
                Whatsapp KVKK
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;&lt;a class=&quot;&quot; href=&quot;/site-haritasi&quot; target=&quot;_blank&quot;&gt;
                Site Haritası
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;&lt;pz-button class=&quot;categorie-title js-store-modal-open mobile-hidden pz-button -appearance-ghost&quot; appearance=&quot;ghost&quot; data-modal=&quot;.js-store-modal&quot;&gt;
      
      
      &lt;span class=&quot;pz-button__text&quot;&gt;Mağazalarımız&lt;/span&gt;
    &lt;/pz-button&gt;&lt;a class=&quot;desktop-hidden&quot; href=&quot;/address/stores/&quot; target=&quot;_blank&quot;&gt;
                Mağazalarımız
              &lt;/a&gt;
            &lt;/li&gt;&lt;li&gt;&lt;a class=&quot;&quot; href=&quot;/kampanyalarimiz&quot; target=&quot;_blank&quot;&gt;
                Kampanyalar
              &lt;/a&gt;
            &lt;/li&gt;&lt;/ul&gt;
      ">
        <header class="pz-expandable__header js-pz-expandable-header">
          <h3 class="title">Yardım</h3>
          
        </header>
        <div class="pz-expandable__body">
          <div class="content">
        
        
        <ul class="footer-menu__categories"><li><a class="" href="/sss" target="_blank">
                Sıkça Sorulan Sorular
              </a>
            </li><li><a class="" href="/iptal-iade" target="_blank">
                İptal &amp; İade Prosedürü
              </a>
            </li><li><a class="" href="/yardim/" target="_blank">
                İade Talebi Oluşturma Rehberi
              </a>
            </li><li><a class="" href="/uyeliksiz-siparis-takibi" target="_blank">
                Üyeliksiz Sipariş Takibi
              </a>
            </li><li><a class="" href="/kisisel-verilerin-korunmasi" target="_blank">
                Kişisel Verilerin Korunması
              </a>
            </li><li><a class="" href="/whatsapp-kisisel-verilerin-korunmasi-kanunu/">
                Whatsapp KVKK
              </a>
            </li><li><a class="" href="/site-haritasi" target="_blank">
                Site Haritası
              </a>
            </li><li><pz-button class="categorie-title js-store-modal-open mobile-hidden pz-button -appearance-ghost" appearance="ghost" data-modal=".js-store-modal">
      
      
      <span class="pz-button__text">Mağazalarımız</span>
    </pz-button><a class="desktop-hidden" href="/address/stores/" target="_blank">
                Mağazalarımız
              </a>
            </li><li><a class="" href="/kampanyalarimiz" target="_blank">
                Kampanyalar
              </a>
            </li></ul>
      </div>
        </div>
      </pz-expandable><pz-expandable class="footer-popcategories pz-expandable" max-breakpoint="1170" title="Popüler Kategoriler" data-initial-h-t-m-l="
  &lt;header class=&quot;pz-expandable__header -fake js-pz-expandable-header-fake&quot;&gt;
    &lt;div class=&quot;pz-expandable__title-wrapper&quot;&gt;
    &lt;h3 class=&quot;title&quot;&gt;Popüler Kategoriler&lt;/h3&gt;
    &lt;/div&gt;
    &lt;i class=&quot;toggle-icon pz-icon-chevron-down&quot;&gt;&lt;/i&gt;
  &lt;/header&gt;
  &lt;div class=&quot;pz-expandable__header -space js-pz-expandable-header-fake-breakpoint&quot;&gt;&lt;/div&gt;
  &lt;div class=&quot;footer-popcategories__items&quot;&gt;&lt;ul class=&quot;footer-popcategories__box -mobile&quot;&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;https://www.koton.ro/&quot;&gt;
            Koton Romanya
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;https://www.koton.kz&quot;&gt;
            Koton Kazakistan
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;https://www.koton.ru/&quot;&gt;
            Koton Rusya
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;https://www.koton.rs/&quot;&gt;
            Koton Sırbistan
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-elbise/&quot;&gt;
            Kadın Elbise
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-gomlek/&quot;&gt;
            Kadın Gömlek
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-etek/&quot;&gt;
            Kadın Etek
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-sort/&quot;&gt;
            Kadın Şort
          &lt;/a&gt;
        &lt;/li&gt;&lt;/ul&gt;&lt;ul class=&quot;footer-popcategories__box -mobile&quot;&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-bluz/&quot;&gt;
            Kadın Bluz
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-pantolon/&quot;&gt;
            Kadın Pantolon
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/keten-gomlek-kadin/&quot;&gt;
            Kadın Keten Gömlek
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-tisort/&quot;&gt;
            Kadın Tişört
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-atlet/&quot;&gt;
            Kadın Top/Atlet
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-koton-jeans/&quot;&gt;
            Kadın Kot Pantolon &amp;amp; Jean
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/yazlik-elbise-kadin/&quot;&gt;
            Kadın Yazlık Elbise
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/beyaz-abiye-elbise/&quot;&gt;
            Kadın Nikah Elbisesi
          &lt;/a&gt;
        &lt;/li&gt;&lt;/ul&gt;&lt;ul class=&quot;footer-popcategories__box -mobile&quot;&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/beyaz-elbise-kadin/&quot;&gt;
            Kadın Beyaz Elbise
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/mezuniyet-elbiseleri/&quot;&gt;
            Mezuniyet Elbisesi
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-abiye-elbise/&quot;&gt;
            Kadın Abiye Elbise
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/bikini-takimi-kadin/&quot;&gt;
            Kadın Bikini Takımı
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-plaj-giyim/&quot;&gt;
            Kadın Plaj Giyim
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-mayo/&quot;&gt;
            Kadın Mayo
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-sutyen/&quot;&gt;
            Kadın Sütyen
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-keten-gomlek/&quot;&gt;
            Erkek Keten Gömlek
          &lt;/a&gt;
        &lt;/li&gt;&lt;/ul&gt;&lt;ul class=&quot;footer-popcategories__box -mobile&quot;&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-tisort/&quot;&gt;
            Erkek Tişört
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-polo-tisort/&quot;&gt;
            Erkek Polo Yaka Tişört
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-atlet/&quot;&gt;
            Erkek Atlet
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-pantolon/&quot;&gt;
            Erkek Pantolon
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-keten-pantolon/&quot;&gt;
            Erkek Keten Pantolon
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-koton-jeans/&quot;&gt;
            Erkek Kot Pantolon &amp;amp; Jean
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-gomlek/&quot;&gt;
            Erkek Gömlek
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-sort-bermuda/&quot;&gt;
            Erkek Şort
          &lt;/a&gt;
        &lt;/li&gt;&lt;/ul&gt;&lt;ul class=&quot;footer-popcategories__box -mobile&quot;&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-deniz-sortu/&quot;&gt;
            Erkek Deniz Şortu
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kiz-cocuk-elbise-tulum/&quot;&gt;
            Kız Çocuk Elbise
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kiz-cocuk-sort/&quot;&gt;
            Kız Çocuk Şort
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-cocuk-tisort/&quot;&gt;
            Erkek Çocuk Tişört
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-cocuk-sort/&quot;&gt;
            Erkek Çocuk Şort
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kiz-bebek-elbise-tulum/&quot;&gt;
            Bebek Elbise &amp;amp; Tulum
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-bebek-tisort/&quot;&gt;
            Erkek Bebek Tişört
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/erkek-bebek-pantolon-kot-pantolon/&quot;&gt;
            Erkek Bebek Şort
          &lt;/a&gt;
        &lt;/li&gt;&lt;/ul&gt;&lt;ul class=&quot;footer-popcategories__box -desktop&quot;&gt;&lt;li class=&quot;footer-popcategories__item -title&quot;&gt;Popüler Kategoriler&lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;https://www.koton.ro/&quot;&gt;
            Koton Romanya
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;https://www.koton.kz&quot;&gt;
            Koton Kazakistan
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;https://www.koton.ru/&quot;&gt;
            Koton Rusya
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;https://www.koton.rs/&quot;&gt;
            Koton Sırbistan
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-elbise/&quot;&gt;
            Kadın Elbise
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-gomlek/&quot;&gt;
            Kadın Gömlek
          &lt;/a&gt;
        &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
          &lt;a href=&quot;/kadin-etek/&quot;&gt;
            Kadın Etek
          &lt;/a&gt;
        &lt;/li&gt;&lt;/ul&gt;&lt;ul class=&quot;footer-popcategories__box -desktop&quot;&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kadin-sort/&quot;&gt;
                  Kadın Şort
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kadin-bluz/&quot;&gt;
                  Kadın Bluz
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kadin-pantolon/&quot;&gt;
                  Kadın Pantolon
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/keten-gomlek-kadin/&quot;&gt;
                  Kadın Keten Gömlek
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kadin-tisort/&quot;&gt;
                  Kadın Tişört
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kadin-atlet/&quot;&gt;
                  Kadın Top/Atlet
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kadin-koton-jeans/&quot;&gt;
                  Kadın Kot Pantolon &amp;amp; Jean
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/yazlik-elbise-kadin/&quot;&gt;
                  Kadın Yazlık Elbise
                &lt;/a&gt;
              &lt;/li&gt;&lt;/ul&gt;&lt;ul class=&quot;footer-popcategories__box -desktop&quot;&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/beyaz-abiye-elbise/&quot;&gt;
                  Kadın Nikah Elbisesi
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/beyaz-elbise-kadin/&quot;&gt;
                  Kadın Beyaz Elbise
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/mezuniyet-elbiseleri/&quot;&gt;
                  Mezuniyet Elbisesi
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kadin-abiye-elbise/&quot;&gt;
                  Kadın Abiye Elbise
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/bikini-takimi-kadin/&quot;&gt;
                  Kadın Bikini Takımı
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kadin-plaj-giyim/&quot;&gt;
                  Kadın Plaj Giyim
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kadin-mayo/&quot;&gt;
                  Kadın Mayo
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kadin-sutyen/&quot;&gt;
                  Kadın Sütyen
                &lt;/a&gt;
              &lt;/li&gt;&lt;/ul&gt;&lt;ul class=&quot;footer-popcategories__box -desktop&quot;&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-keten-gomlek/&quot;&gt;
                  Erkek Keten Gömlek
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-tisort/&quot;&gt;
                  Erkek Tişört
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-polo-tisort/&quot;&gt;
                  Erkek Polo Yaka Tişört
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-atlet/&quot;&gt;
                  Erkek Atlet
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-pantolon/&quot;&gt;
                  Erkek Pantolon
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-keten-pantolon/&quot;&gt;
                  Erkek Keten Pantolon
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-koton-jeans/&quot;&gt;
                  Erkek Kot Pantolon &amp;amp; Jean
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-gomlek/&quot;&gt;
                  Erkek Gömlek
                &lt;/a&gt;
              &lt;/li&gt;&lt;/ul&gt;&lt;ul class=&quot;footer-popcategories__box -desktop&quot;&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-sort-bermuda/&quot;&gt;
                  Erkek Şort
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-deniz-sortu/&quot;&gt;
                  Erkek Deniz Şortu
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kiz-cocuk-elbise-tulum/&quot;&gt;
                  Kız Çocuk Elbise
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kiz-cocuk-sort/&quot;&gt;
                  Kız Çocuk Şort
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-cocuk-tisort/&quot;&gt;
                  Erkek Çocuk Tişört
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-cocuk-sort/&quot;&gt;
                  Erkek Çocuk Şort
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/kiz-bebek-elbise-tulum/&quot;&gt;
                  Bebek Elbise &amp;amp; Tulum
                &lt;/a&gt;
              &lt;/li&gt;&lt;li class=&quot;footer-popcategories__item&quot;&gt;
                &lt;a href=&quot;/erkek-bebek-tisort/&quot;&gt;
                  Erkek Bebek Tişört
                &lt;/a&gt;
              &lt;/li&gt;&lt;/ul&gt;&lt;/div&gt;
">
        <header class="pz-expandable__header js-pz-expandable-header">
          <h3 class="title">Popüler Kategoriler</h3>
          
        </header>
        <div class="pz-expandable__body">
          <div class="content">
  
  
  <div class="footer-popcategories__items"><ul class="footer-popcategories__box -mobile"><li class="footer-popcategories__item">
          <a href="https://www.koton.ro/">
            Koton Romanya
          </a>
        </li><li class="footer-popcategories__item">
          <a href="https://www.koton.kz">
            Koton Kazakistan
          </a>
        </li><li class="footer-popcategories__item">
          <a href="https://www.koton.ru/">
            Koton Rusya
          </a>
        </li><li class="footer-popcategories__item">
          <a href="https://www.koton.rs/">
            Koton Sırbistan
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-elbise/">
            Kadın Elbise
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-gomlek/">
            Kadın Gömlek
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-etek/">
            Kadın Etek
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-sort/">
            Kadın Şort
          </a>
        </li></ul><ul class="footer-popcategories__box -mobile"><li class="footer-popcategories__item">
          <a href="/kadin-bluz/">
            Kadın Bluz
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-pantolon/">
            Kadın Pantolon
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/keten-gomlek-kadin/">
            Kadın Keten Gömlek
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-tisort/">
            Kadın Tişört
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-atlet/">
            Kadın Top/Atlet
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-koton-jeans/">
            Kadın Kot Pantolon &amp; Jean
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/yazlik-elbise-kadin/">
            Kadın Yazlık Elbise
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/beyaz-abiye-elbise/">
            Kadın Nikah Elbisesi
          </a>
        </li></ul><ul class="footer-popcategories__box -mobile"><li class="footer-popcategories__item">
          <a href="/beyaz-elbise-kadin/">
            Kadın Beyaz Elbise
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/mezuniyet-elbiseleri/">
            Mezuniyet Elbisesi
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-abiye-elbise/">
            Kadın Abiye Elbise
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/bikini-takimi-kadin/">
            Kadın Bikini Takımı
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-plaj-giyim/">
            Kadın Plaj Giyim
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-mayo/">
            Kadın Mayo
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-sutyen/">
            Kadın Sütyen
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/erkek-keten-gomlek/">
            Erkek Keten Gömlek
          </a>
        </li></ul><ul class="footer-popcategories__box -mobile"><li class="footer-popcategories__item">
          <a href="/erkek-tisort/">
            Erkek Tişört
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/erkek-polo-tisort/">
            Erkek Polo Yaka Tişört
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/erkek-atlet/">
            Erkek Atlet
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/erkek-pantolon/">
            Erkek Pantolon
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/erkek-keten-pantolon/">
            Erkek Keten Pantolon
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/erkek-koton-jeans/">
            Erkek Kot Pantolon &amp; Jean
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/erkek-gomlek/">
            Erkek Gömlek
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/erkek-sort-bermuda/">
            Erkek Şort
          </a>
        </li></ul><ul class="footer-popcategories__box -mobile"><li class="footer-popcategories__item">
          <a href="/erkek-deniz-sortu/">
            Erkek Deniz Şortu
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kiz-cocuk-elbise-tulum/">
            Kız Çocuk Elbise
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kiz-cocuk-sort/">
            Kız Çocuk Şort
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/erkek-cocuk-tisort/">
            Erkek Çocuk Tişört
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/erkek-cocuk-sort/">
            Erkek Çocuk Şort
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kiz-bebek-elbise-tulum/">
            Bebek Elbise &amp; Tulum
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/erkek-bebek-tisort/">
            Erkek Bebek Tişört
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/erkek-bebek-pantolon-kot-pantolon/">
            Erkek Bebek Şort
          </a>
        </li></ul><ul class="footer-popcategories__box -desktop"><li class="footer-popcategories__item -title">Popüler Kategoriler</li><li class="footer-popcategories__item">
          <a href="https://www.koton.ro/">
            Koton Romanya
          </a>
        </li><li class="footer-popcategories__item">
          <a href="https://www.koton.kz">
            Koton Kazakistan
          </a>
        </li><li class="footer-popcategories__item">
          <a href="https://www.koton.ru/">
            Koton Rusya
          </a>
        </li><li class="footer-popcategories__item">
          <a href="https://www.koton.rs/">
            Koton Sırbistan
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-elbise/">
            Kadın Elbise
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-gomlek/">
            Kadın Gömlek
          </a>
        </li><li class="footer-popcategories__item">
          <a href="/kadin-etek/">
            Kadın Etek
          </a>
        </li></ul><ul class="footer-popcategories__box -desktop"><li class="footer-popcategories__item">
                <a href="/kadin-sort/">
                  Kadın Şort
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/kadin-bluz/">
                  Kadın Bluz
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/kadin-pantolon/">
                  Kadın Pantolon
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/keten-gomlek-kadin/">
                  Kadın Keten Gömlek
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/kadin-tisort/">
                  Kadın Tişört
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/kadin-atlet/">
                  Kadın Top/Atlet
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/kadin-koton-jeans/">
                  Kadın Kot Pantolon &amp; Jean
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/yazlik-elbise-kadin/">
                  Kadın Yazlık Elbise
                </a>
              </li></ul><ul class="footer-popcategories__box -desktop"><li class="footer-popcategories__item">
                <a href="/beyaz-abiye-elbise/">
                  Kadın Nikah Elbisesi
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/beyaz-elbise-kadin/">
                  Kadın Beyaz Elbise
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/mezuniyet-elbiseleri/">
                  Mezuniyet Elbisesi
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/kadin-abiye-elbise/">
                  Kadın Abiye Elbise
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/bikini-takimi-kadin/">
                  Kadın Bikini Takımı
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/kadin-plaj-giyim/">
                  Kadın Plaj Giyim
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/kadin-mayo/">
                  Kadın Mayo
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/kadin-sutyen/">
                  Kadın Sütyen
                </a>
              </li></ul><ul class="footer-popcategories__box -desktop"><li class="footer-popcategories__item">
                <a href="/erkek-keten-gomlek/">
                  Erkek Keten Gömlek
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/erkek-tisort/">
                  Erkek Tişört
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/erkek-polo-tisort/">
                  Erkek Polo Yaka Tişört
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/erkek-atlet/">
                  Erkek Atlet
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/erkek-pantolon/">
                  Erkek Pantolon
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/erkek-keten-pantolon/">
                  Erkek Keten Pantolon
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/erkek-koton-jeans/">
                  Erkek Kot Pantolon &amp; Jean
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/erkek-gomlek/">
                  Erkek Gömlek
                </a>
              </li></ul><ul class="footer-popcategories__box -desktop"><li class="footer-popcategories__item">
                <a href="/erkek-sort-bermuda/">
                  Erkek Şort
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/erkek-deniz-sortu/">
                  Erkek Deniz Şortu
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/kiz-cocuk-elbise-tulum/">
                  Kız Çocuk Elbise
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/kiz-cocuk-sort/">
                  Kız Çocuk Şort
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/erkek-cocuk-tisort/">
                  Erkek Çocuk Tişört
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/erkek-cocuk-sort/">
                  Erkek Çocuk Şort
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/kiz-bebek-elbise-tulum/">
                  Bebek Elbise &amp; Tulum
                </a>
              </li><li class="footer-popcategories__item">
                <a href="/erkek-bebek-tisort/">
                  Erkek Bebek Tişört
                </a>
              </li></ul></div>
</div>
        </div>
      </pz-expandable></pz-accordion></div>  
      <div class="footer-container__box"><div class="footer-contact">
  <div class="footer-contact__box"><div class="footer-contact__title">
      BİZE ULAŞIN
    </div><div class="footer-contact__item-wrapper"><div class="footer-contact__item">
        <i class="footer-contact__item-icon pz-icon-contact-phone"></i>
        <a class="footer-contact__item-link" href="tel:0850 208 71 71">
          0850 208 71 71
        </a>
      </div><div class="footer-contact__item">
        <i class="footer-contact__item-icon pz-icon-contact-email"></i>
        <a class="footer-contact__item-link" href="mailto:mim@koton.com">
          mim@koton.com
        </a>
      </div></div>

    <div class="footer-contact__item-box"><i class="footer-contact__item-box-icon pz-icon-contact-whatsapp"></i>
        <a class="footer-contact__item-box-link" href="https://api.whatsapp.com/send?phone=908502087171" target="_blank">
          Whatsapp Destek Hattı
        </a></div>
  </div>
</div></div>
    </div><div class="footer-social">
      <div class="footer-social__items"><a href="https://www.facebook.com/koton/" aria-label="facebook" rel="noreferrer" target="_blank">
            <i class="pz-icon-facebook-footer"></i>
          </a><a href="https://www.instagram.com/koton/" aria-label="instagram" rel="noreferrer" target="_blank">
            <i class="pz-icon-instagram-footer"></i>
          </a><a href="https://twitter.com/koton" aria-label="twitter" rel="noreferrer" target="_blank">
            <i class="pz-icon-twitter-footer"></i>
          </a><a href="https://www.linkedin.com/company/kotonretail" aria-label="linkedin" rel="noreferrer" target="_blank">
            <i class="pz-icon-linkedin"></i>
          </a><a href="https://www.youtube.com/user/kotonmagazalari" aria-label="youtube" rel="noreferrer" target="_blank">
            <i class="pz-icon-youtube"></i>
          </a><a href="https://www.tiktok.com/@kotoncom" aria-label="tiktok" rel="noreferrer" target="_blank">
            <i class="pz-icon-tiktok"></i>
          </a><a href="https://open.spotify.com/user/d01j5e2gy1pfofbf2kbvqwis6?si=35c9f045b4dc43c2&amp;nd=1" aria-label="spotify" rel="noreferrer" target="_blank">
            <i class="pz-icon-spotify"></i>
          </a></div>
  </div><div class="footer-paying">
  <div class="footer-paying__wrapper"><div class="footer-copyright">© Copyright 2001-2025 Koton.com</div><div class="language-form-modal__area"><div class="language-form-modal-container js-language-form-container ">
    <div class="language-form-modal-wrapper">
      <div class="js-language-button language-form-modal-button">
        <i class="pz-icon-earth"></i>
        <span class="language-form-modal-text">Türkçe</span>

        <span class="language-form-modal-text -short">TR</span>

        <i class="pz-icon-chevron-down"></i>
      </div>

      <div class="language-form-modal js-language-modal" hidden="">
        <div class="language-form-modal-close js-language-modal-close">
          <span class="-close"></span>
        </div>

        <div class="language-form-modal-title">Dil Seçimi</div>
        <div class="language-form-modal-header">
          Dil Seçenekleri
        </div><form class="js-language-form language-form active" method="POST" action="/setlang/"><input type="hidden" name="csrfmiddlewaretoken" value="P4KV9wv4Glf4KwsYaK6UFcVIgfRwLirvr2MfsFLw1xHGKKv9PXqlFngM5hfPUWmQ"><input type="hidden" name="next" value="/erkek-tisort/">
          <input type="hidden" name="language" value="tr-tr"><button type="submit" class="active">
              Türkçe
              <span><i class="pz-icon-check js-check-icon"></i></span>
            </button></form><form class="js-language-form language-form " method="POST" action="/setlang/"><input type="hidden" name="csrfmiddlewaretoken" value="P4KV9wv4Glf4KwsYaK6UFcVIgfRwLirvr2MfsFLw1xHGKKv9PXqlFngM5hfPUWmQ"><input type="hidden" name="next" value="/erkek-tisort/">
          <input type="hidden" name="language" value="en-us"><button type="submit" class="">
              English
              <span><i class="pz-icon-check js-check-icon" hidden=""></i></span>
            </button></form><pz-button class="js-language-modal-confirm language-form-modal-container-mobile-confirm pz-button -appearance-filled">
      
      
      <span class="pz-button__text">Kaydet</span>
    </pz-button>
      </div>
    </div>
</div></div>
   <div class="footer-paying__area">
    <ul class="footer-paying__items"><li class="footer-paying__item">
          
          <a target="_blank" href="#secure">
          <img src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/mc-ssl-secure-new.svg" alt="Koton Secure" loading="lazy">
          </a>
          
        </li><li class="footer-paying__item">
          
          <a target="_blank" href="#mastercard">
          <img src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/mc-mastercard-new.svg" alt="Koton Mastercard" loading="lazy">
          </a>
          
        </li><li class="footer-paying__item">
          
          <a target="_blank" href="#visa">
          <img src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/visa-new.png" alt="Koton Visa" loading="lazy">
          </a>
          
        </li><li class="footer-paying__item">
          
          <a target="_blank" href="https://www.eticaret.gov.tr/siteprofil/23A38899E980430F8A61C08EFCBA28C4/wwwkotoncom">
          <img src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/etbis.png" alt="Koton Etbis" loading="lazy">
          </a>
          
        </li></ul><div class="footer-paying__title">
      Güvenli Ödeme Sistemi Sunuyoruz.
    </div>
   </div></div>
</div></div>
  <pz-button class="footer__scroll-top js-scroll-top -icon-button pz-button -icon-left -appearance-filled -visible" icon="chevron-up">
      <i class="pz-button__icon pz-icon-chevron-up"></i>
      
      
    </pz-button>
  <a class="footer__chatbot" href="https://api.whatsapp.com/send?phone=908502087171">
    <img src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/chatbot_icon.png">
  </a>
</footer><pz-modal theme="classic" class="js-store-modal store-modal -theme-classic -type-modal">
      <div class="pz-modal-dialog">
        <header class="pz-modal-dialog__header">
          
          
          <pz-button appearance="ghost" size="sm" icon="close" class="close-button js-close-button -icon-button pz-button -icon-left -appearance-ghost -size-sm">
      <i class="pz-button__icon pz-icon-close"></i>
      
      
    </pz-button>
        </header>
        <div class="pz-modal-dialog__content">
<div class="stores__main-title">
  Mağazalarımız
</div>
<div class="stores__main-description">
  Aradığınız KOTON mağazasına ülke ve şehir bilgilerini seçerek ulaşabilirsiniz.
</div>
<pz-form class="stores__form pz-form"><form>
  <div class="stores__form-wrapper">
    <div class="stores__form-select js-country-select-container -page-loaded">
     <pz-select name="country" size="3xl" icon="store-arrow-down" class="js-country-select pz-select -w-full -size-3xl -has-value" v-required="" w-full="">
      <div class="pz-select-w ">
        <button class="pz-select-w__button toggle-button" type="button" name="button-country" aria-label="button-country">
          <i class="pz-select-w__icon pz-icon-store-arrow-down"></i>
          <span class="pz-select-w__label">
          Ülke Seçiniz
        </span>
        </button>
        <select name="country" aria-label="country" class="pz-form-input" id="pz-form-input-42a58"><option value="0" selected="" hidden="" class="-selected">
          Ülke Seçiniz
        </option></select>
        <div class="pz-select-w__overlay toggle-button"></div>
        <div class="pz-select-w__wrapper">
          
          <ol class="pz-select-w__list"><li value="0" selected="" hidden="" data-value="0" class="-selected">
          Ülke Seçiniz
        </li></ol>
        </div>
      </div>
    </pz-select>
    </div>

    <div class="stores__form-select -page-loaded">
      <pz-select size="3xl" name="city" icon="store-arrow-down" class="js-city-select pz-select -w-full -size-3xl -has-value" v-required="" w-full="">
      <div class="pz-select-w ">
        <button class="pz-select-w__button toggle-button" type="button" name="button-city" aria-label="button-city">
          <i class="pz-select-w__icon pz-icon-store-arrow-down"></i>
          <span class="pz-select-w__label">
          Şehir Seçiniz
        </span>
        </button>
        <select name="city" aria-label="city" class="pz-form-input" id="pz-form-input-00fc8"><option value="0" selected="" hidden="" class="-selected">
          Şehir Seçiniz
        </option></select>
        <div class="pz-select-w__overlay toggle-button"></div>
        <div class="pz-select-w__wrapper">
          
          <ol class="pz-select-w__list"><li value="0" selected="" hidden="" data-value="0" class="-selected">
          Şehir Seçiniz
        </li></ol>
        </div>
      </div>
    </pz-select>
    </div>

    <div class="stores__form-button">
      <pz-button size="3xl" type="button" class="stores__form-button js-stores-button -w-full pz-button -appearance-filled -size-3xl" w-full="">
      
      
      <span class="pz-button__text">Arama</span>
    </pz-button>
    </div>
  </div>
  <p class="stores__form-error js-form-error" hidden="true"></p>
</form></pz-form>

<div class="stores__wrapper">
  <div class="stores__list js-stores-list"></div>
</div>
</div>
        <div class="pz-modal-dialog__buttons"><pz-button class="modal-button js-close-button pz-button -appearance-outlined -shadow -size-xl">
      
      
      <span class="pz-button__text">Kapat</span>
    </pz-button></div>
      </div>
    </pz-modal><pz-modal class="modal-stock-alert js-modal-stock-alert -theme-zero -type-modal" modal-title="Senin için not alıyoruz!" icon="bell">
      <div class="pz-modal-dialog">
        <header class="pz-modal-dialog__header">
          <i class="icon pz-icon-bell"></i>
          <h3 class="title">Senin için not alıyoruz!</h3>
          <pz-button appearance="ghost" size="sm" icon="close" class="close-button js-close-button -icon-button pz-button -icon-left -appearance-ghost -size-sm">
      <i class="pz-button__icon pz-icon-close"></i>
      
      
    </pz-button>
        </header>
        <div class="pz-modal-dialog__content">
  <p>Ürün tekrar stoklarımıza geldiğinde, hesabındaki mail adresine talebin 
üzerine bilgilendirme yapacağız.<br><br><strong></strong></p>
</div>
        <div class="pz-modal-dialog__buttons"><pz-button class="modal-button js-close-button pz-button -appearance-outlined -shadow -size-xl">
      
      
      <span class="pz-button__text">Kapat</span>
    </pz-button></div>
      </div>
    </pz-modal></div><div class="bg-overlay js-bg-overlay hidden ">
    
  </div>
    <div class="modal__bg basket-popup-bg js-basket-bg" style="display: none"></div>
    <div class="product-similar-search-modal list js-product-similar-search-modal" hidden="">
  <div class="product-similar-search-modal__close">
    <i class="icon pz-icon-close js-modal-close-button"></i>
  </div>
  <div class="product-similar-search-modal__content">
    <div class="product-similar-search-modal__title">Sizin tarzınıza benzer bir şey mi arıyorsunuz?</div>
    <div class="product-similar-search-modal__subtitle">Bir resim yükleyin, ürünü seçin ve alışverişe başlayın!</div>
    <input type="file" name="pic" class="js-header-upload-input" accept="image/jpeg,image/png,image/webp" style="display: none" aria-label="syte camera file upload" hidden="">
    <div class="product-similar-search-modal__upload">
      <button class=" js-product-similar-upload" icon="camera">
        <p>Fotoğraf Seç</p>
      </button>
    </div>
    <div class="error js-product-similar-error hidden">

    </div>
  </div>
  <div class="product-similar-search-modal__results">
    <div>
      <p>
        En iyi sonuçlar için:
      </p>
      <ul>
        <li>Net ürün görselleri yükleyin</li>
        <li>Basit arka planlı görseller kullanın</li>
        <li>Ana ürüne odaklanın</li>
        <li>Belirli detaylara odaklanmak için kırpma aracını kullanın</li>
      </ul>
    </div>
  </div>
</div>

<div class="product-similar-modal-overlay js-product-similar-modal-overlay" hidden=""></div>
<div class="product-similar-modal js-product-similar-modal" hidden="">
  <div class="product-similar-modal__close">
    <i class="pz-icon-close js-similar-modal-close-button"></i>
  </div>
  <div class="product-similar-modal__left">
    <h3>Ürün Eşleşmeleri</h3>
    <div class="product-similar-modal__image-container js-product-similar-image-container">
      <img id="image" class="js-croppable-image" src="" data-src="" alt="" style="width: 100%; max-width: 267px;">
      <div class="product-similar-modal__icon-button js-start-cropping">
        <i class="pz-icon-crop"></i>
      </div>
      <div class="product-similar-modal__icon-button js-stop-cropping" hidden="">
        <i class="pz-icon-close"></i>
      </div>
      <div class="product-similar-modal__icon-button similar-save js-save-crop" hidden="">
        <i class="pz-icon-checked"></i> 
      </div>
    </div>
    <div class="similar-error js-product-similar-error" hidden="">

    </div>
    <div class="product-similar-modal__upload-area js-new-image-upload">
      <input type="file" name="pic" class="js-upload-input" accept="image/jpeg,image/png,image/webp" aria-label="syte camera file upload" hidden="">
      <i class="icon pz-icon-camera-solid"></i>
      <div>
        Yeni Görsel
      </div>
    </div>

    <div class="product-similar-modal__filters js-filter-container">

    </div>
  </div>
  <div class="product-similar-modal__right">
    <div class="product-similar-modal__header">
      <div class="result-count js-result-count"></div>

      <div class="js-open-mobile-filter-button open-mobile-filter-button" hidden="">
        FİLTRELE
        <i class="pz-icon-chevron-down ms-2"></i>
      </div>

      <div class="product-similar-modal__sorting-container js-sorting-container"></div>
    </div>
    <div class="product-similar-modal__content">
      <div class="product-similar-modal__list js-product-similar-list">
      </div>
      <div class="js-product-similar-list-footer product-similar-modal__list-footer" hidden=""> </div>
    </div>
  </div>
</div>

<div class="product-similar-filter-modal-overlay js-product-similar-filter-modal-overlay" hidden=""></div>
<div class="product-similar-filter-modal js-product-similar-filter-modal" hidden="">
</div><script src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/js/runtime.js" integrity="sha256-KWtVRkcmbDffYsnk9iNGoBwc4icp9ripBXLYjdcnnI8=" crossorigin="anonymous"></script>

<script type="module" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/js/hydration.js" integrity="sha256-JIEP6gU5H6Q5Ip9DSDUdnyLqFHQXgxaR3WrQiGrkOso=" crossorigin="anonymous"></script>

<script nomodule="" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/js/hydration-legacy.js" integrity="sha256-C7HD1hT3E2FNUBAr3UitNbNzh/THg2Qdux4Z6Q+JfTs=" crossorigin="anonymous"></script>

<script type="module" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/js/app.js" integrity="sha256-9gKcHuldB8kB2/txe6vVSIBPV6EvgZsgezM8JTR/gIQ=" crossorigin="anonymous"></script>

<script nomodule="" src="https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/js/app-legacy.js" integrity="sha256-JhLz4KsYmGBhl6TM0VG423pxivmuGJbk+ror+CQgIg8=" crossorigin="anonymous"></script>


<script>
  (function(ci){
    var ef=window[ci]=function(){
      return ef.q.push(arguments);
    };
    ef.q=[];ef.a={};
  })('ci360');
</script>

<script>
  function findTaxonomy(productPk, data) {
    var item;

    data.forEach(function(i) {
      if(i.pk === productPk) {
        item = i;
      }
    });

    return item ? item.taxonomy : [];
  }

  if (!window.pushEmarsysBasketData) {
    window.pushEmarsysBasketData = function(basketData = {}) {
      var cartItems = [];

      if (Object.keys(basketData).length > 0) {
        basketData.basketitem_set.forEach(function(item) {
          cartItems.push({
            item: String(item.product.pk),
            price: parseFloat(item.price),
            quantity: item.quantity
          });
        });
      }

      window.dataLayer.push({
        'event': 'cartInfo',
        cartItems
      });
    }
  }
</script>

<script type="application/ld+json">
{
  "@context": "http://schema.org/",
  "@type": "WebSite",
  "name": "Koton",
  "url": "https://www.koton.com/",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.koton.com/list/?search_text={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
</script>
<script type="application/ld+json">
    {
    "@context": "http://schema.org",
    "@type": "Organization",
    "name": "Koton",
    "url": "https://www.koton.com/",
    "logo": "https://054308f5.cdn.akinoncloud.com/static_omnishop/koton463/img/logo.svg",
    "sameAs": [ ]
    }
</script>
<div class="pz-mini-basket-overlay js-mini-basket-overlay js-mini-basket-hide-btn -type-popup -loaded"></div><script type="text/javascript" id="" charset="">(function(){function c(){var a={};window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(d,b,f){a[b]=f});return a}function e(a,d,b){if(b){var f="domain\x3d"+location.hostname.replace(/^www\./i,"")+";",g=new Date;g.setTime(g.getTime()+24*b*60*60*1E3);b="; expires\x3d"+g.toGMTString()}else b="";document.cookie=a+"\x3d"+d+b+"; SameSite\x3dLax;secure; path\x3d/;"+f}function h(a){var d="true"==a.lastclick?"lc_pfx":"pc_pfx",b="true"==a.lastclick?"pfx_lastclick":"pfx_postclick";"false"==a.lastclick&&
c()[a.variable]==a.source&&(e(b,"gelirortaklari",a.cookieWindow),c().pfx&&e(d,c().pfx,a.cookieWindow));"true"==a.lastclick&&(c()[a.variable]?(e(b,c()[a.variable],a.cookieWindow),c().pfx?e(d,c().pfx,a.cookieWindow):(a=d,d="domain\x3d"+location.hostname.replace(/^www\./i,"")+";",b=new Date,b.setTime(b.getTime()-864E5),b="; expires\x3d"+b.toGMTString(),document.cookie=a+"\x3d"+b+"; SameSite\x3dLax;secure; path\x3d/;"+d)):c().gclid&&e(b,"adwords",1))}var k={variable:"utm_source",source:"gelirortaklari",
lastclick:"true",cookieWindow:3};h(k)})();</script>
<script type="text/javascript" id="" charset="">!function(b,e,f,g,a,c,d){b.fbq||(a=b.fbq=function(){a.callMethod?a.callMethod.apply(a,arguments):a.queue.push(arguments)},b._fbq||(b._fbq=a),a.push=a,a.loaded=!0,a.version="2.0",a.queue=[],c=e.createElement(f),c.async=!0,c.src=g,d=e.getElementsByTagName(f)[0],d.parentNode.insertBefore(c,d))}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");</script>

<script type="text/javascript" id="" charset="">if("home"==google_tag_manager["rm"]["56358421"](8))var google_tag_params={ecomm_pagetype:google_tag_manager["rm"]["56358421"](9)};else"product"==google_tag_manager["rm"]["56358421"](10)?google_tag_params={ecomm_pagetype:google_tag_manager["rm"]["56358421"](11),ecomm_prodcat:google_tag_manager["rm"]["56358421"](12),ecomm_prodid:google_tag_manager["rm"]["56358421"](13),ecomm_pname:google_tag_manager["rm"]["56358421"](14)}:"basket"==google_tag_manager["rm"]["56358421"](15)?google_tag_params={ecomm_pagetype:google_tag_manager["rm"]["56358421"](16),ecomm_totalvalue:google_tag_manager["rm"]["56358421"](17)}:"search"==google_tag_manager["rm"]["56358421"](18)?google_tag_params={ecomm_pagetype:google_tag_manager["rm"]["56358421"](19),
ecomm_pcat:google_tag_manager["rm"]["56358421"](20)}:"success"==google_tag_manager["rm"]["56358421"](21)?google_tag_params={ecomm_pagetype:google_tag_manager["rm"]["56358421"](22),ecomm_totalvalue:google_tag_manager["rm"]["56358421"](23)}:"other"==google_tag_manager["rm"]["56358421"](24)&&(google_tag_params={ecomm_pagetype:google_tag_manager["rm"]["56358421"](25)});dataLayer.push({event:"remarketingTriggered",google_tag_params:google_tag_params});</script><script type="text/javascript" id="" charset="">!function(){var a=window.tdl=window.tdl||[];if(a.invoked)window.console&&console.error&&console.error("Tune snippet has been included more than once.");else{a.invoked=!0;a.methods=["init","identify","convert"];a.factory=function(c){return function(){var b=Array.prototype.slice.call(arguments);return b.unshift(c),a.push(b),a}};for(var d=0;d<a.methods.length;d++){var e=a.methods[d];a[e]=a.factory(e)}a.init=function(c){var b=document.createElement("script");b.type="text/javascript";b.async=!0;b.src=
"https://js.go2sdk.com/v2/tune.js";var f=document.getElementsByTagName("script")[0];f.parentNode.insertBefore(b,f);a.domain=c}}}();tdl.init("https://ad.adrttt.com");tdl.identify();</script>
<script id="" text="" charset="" type="text/javascript" src="//koton.api.useinsider.com/ins.js?id=10008040"></script><script type="text/javascript" id="" charset="">(rtbhEvents=window.rtbhEvents||[]).push({eventType:"offlinecheck"},{eventType:"uid",id:"undefined"});</script>
<script type="text/javascript" id="" charset="">(rtbhEvents=window.rtbhEvents||[]).push({eventType:"placebo"},{eventType:"uid",id:"undefined"});</script>

<script type="text/javascript" id="" charset="">(function(b,e,f,g,c,a,d){b[c]=b[c]||function(){(b[c].a=b[c].a||[]).push(arguments)};b[c].l=1*new Date;for(a=0;a<document.scripts.length;a++)if(document.scripts[a].src===g)return;a=e.createElement(f);d=e.getElementsByTagName(f)[0];a.async=1;a.src=g;d.parentNode.insertBefore(a,d)})(window,document,"script","https://mc.yango.com/metrika/tag_yango.js","ym");ym(95671258,"init",{clickmap:!0,trackLinks:!0,accurateTrackBounce:!0,webvisor:!0,ecommerce:"dataLayerYM"});</script>
<noscript><div><img src="https://mc.yango.com/watch/95671258" style="position:absolute; left:-9999px;" alt=""></div></noscript>
<script type="text/javascript" id="" charset="">!function(){var a=window.tdl=window.tdl||[];if(a.invoked)window.console&&console.error&&console.error("Tune snippet has been included more than once.");else{a.invoked=!0;a.methods=["init","identify","convert"];a.factory=function(c){return function(){var b=Array.prototype.slice.call(arguments);return b.unshift(c),a.push(b),a}};for(var d=0;d<a.methods.length;d++){var e=a.methods[d];a[e]=a.factory(e)}a.init=function(c){var b=document.createElement("script");b.type="text/javascript";b.async=!0;b.src=
"https://js.go2sdk.com/v2/tune.js";var f=document.getElementsByTagName("script")[0];f.parentNode.insertBefore(b,f);a.domain=c}}}();tdl.init("https://ad.reklm.com");tdl.identify();</script>
<script type="text/javascript" id="" charset="">!function(d,g,e){d.TiktokAnalyticsObject=e;var a=d[e]=d[e]||[];a.methods="page track identify instances debug on off once ready alias group enableCookie disableCookie holdConsent revokeConsent grantConsent".split(" ");a.setAndDefer=function(b,c){b[c]=function(){b.push([c].concat(Array.prototype.slice.call(arguments,0)))}};for(d=0;d<a.methods.length;d++)a.setAndDefer(a,a.methods[d]);a.instance=function(b){b=a._i[b]||[];for(var c=0;c<a.methods.length;c++)a.setAndDefer(b,a.methods[c]);return b};a.load=
function(b,c){var f="https://analytics.tiktok.com/i18n/pixel/events.js";a._i=a._i||{};a._i[b]=[];a._i[b]._u=f;a._t=a._t||{};a._t[b]=+new Date;a._o=a._o||{};a._o[b]=c||{};c=document.createElement("script");c.type="text/javascript";c.async=!0;c.src=f+"?sdkid\x3d"+b+"\x26lib\x3d"+e;b=document.getElementsByTagName("script")[0];b.parentNode.insertBefore(c,b)};a.load("D0SQ41RC77U0SCV792MG");a.page()}(window,document,"ttq");</script>
<div style="display: none; visibility: hidden;"><script src="//cdn.segmentify.com/cd31a415-eda5-4d6b-8b8f-527b4f69e026/segmentify.js" charset="UTF-8"></script> </div><script type="text/javascript" id="" charset="">(rtbhEvents=window.rtbhEvents||[]).push({eventType:"category",categoryId:"erkek-tisort"},{eventType:"uid",id:"d41d8cd98f00b204e9800998ecf8427e"});</script>
 


<script type="text/javascript" id="" charset="">!function(d,g,e){d.TiktokAnalyticsObject=e;var a=d[e]=d[e]||[];a.methods="page track identify instances debug on off once ready alias group enableCookie disableCookie".split(" ");a.setAndDefer=function(b,c){b[c]=function(){b.push([c].concat(Array.prototype.slice.call(arguments,0)))}};for(d=0;d<a.methods.length;d++)a.setAndDefer(a,a.methods[d]);a.instance=function(b){b=a._i[b]||[];for(var c=0;c<a.methods.length;c++)a.setAndDefer(b,a.methods[c]);return b};a.load=function(b,c){var f="https://analytics.tiktok.com/i18n/pixel/events.js";
a._i=a._i||{};a._i[b]=[];a._i[b]._u=f;a._t=a._t||{};a._t[b]=+new Date;a._o=a._o||{};a._o[b]=c||{};c=document.createElement("script");c.type="text/javascript";c.async=!0;c.src=f+"?sdkid\x3d"+b+"\x26lib\x3d"+e;b=document.getElementsByTagName("script")[0];b.parentNode.insertBefore(c,b)}}(window,document,"ttq");</script>

<efilli-layout-dynamic></efilli-layout-dynamic><style class="efilli-language-global-css">@import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap')
</style><div id="criteo-tags-div" style="display: none;"></div><img src="https://t.co/i/adsct?bci=3&amp;dv=Asia%2FTashkent%26en%2Ctr%2Cen-US%2Cru%26Google%20Inc.%26Win32%26255%261920%261080%268%2624%261920%261032%260%26na&amp;eci=2&amp;event_id=7e2aedd6-dab2-4f46-a268-25b78496d7ec&amp;events=%5B%5B%22pageview%22%2C%7B%7D%5D%5D&amp;integration=advertiser&amp;p_id=Twitter&amp;p_user_id=0&amp;pl_id=2de557ac-6dc8-4300-94c7-26aa97ec8e1c&amp;tw_document_href=https%3A%2F%2Fwww.koton.com%2Ferkek-tisort%2F&amp;tw_iframe_status=0&amp;tw_order_quantity=0&amp;tw_sale_amount=0&amp;txn_id=nuk4s&amp;type=javascript&amp;version=2.3.33" height="1" width="1" style="display: none;"><img src="https://analytics.twitter.com/i/adsct?bci=3&amp;dv=Asia%2FTashkent%26en%2Ctr%2Cen-US%2Cru%26Google%20Inc.%26Win32%26255%261920%261080%268%2624%261920%261032%260%26na&amp;eci=2&amp;event_id=7e2aedd6-dab2-4f46-a268-25b78496d7ec&amp;events=%5B%5B%22pageview%22%2C%7B%7D%5D%5D&amp;integration=advertiser&amp;p_id=Twitter&amp;p_user_id=0&amp;pl_id=2de557ac-6dc8-4300-94c7-26aa97ec8e1c&amp;tw_document_href=https%3A%2F%2Fwww.koton.com%2Ferkek-tisort%2F&amp;tw_iframe_status=0&amp;tw_order_quantity=0&amp;tw_sale_amount=0&amp;txn_id=nuk4s&amp;type=javascript&amp;version=2.3.33" height="1" width="1" style="display: none;"><iframe id="insider-worker" src="https://koton.api.useinsider.com/worker-new.html" style="display: none;"></iframe><img src="https://rt.udmserve.net/udm/fetch.pix?rtbh=qHdmg7-nU7Pp7Y8YRfj6hzghFX0hJ8ohg4R1QMHEG9s" width="1" height="1" scrolling="no" frameborder="0" style="display:none"><style id="ins-free-style" innerhtml=""></style><iframe allow="join-ad-interest-group" data-tagging-id="AW-940008333" data-load-time="1752722938851" height="0" width="0" src="https://td.doubleclick.net/td/rul/940008333?random=1752722938233&amp;cv=11&amp;fst=1752722938233&amp;fmt=3&amp;bg=ffffff&amp;guid=ON&amp;async=1&amp;en=gtag.config&amp;gtm=45be57f1v9175984773z8856358421za200zb856358421&amp;gcd=13t3t3t3t5l1&amp;dma=0&amp;tag_exp=101509157~103116026~103200004~103233427~103351869~103351871~104684208~104684211~104732253~104732255~104908321~104908323~104964065~104964067~104967141~104967143&amp;u_w=1920&amp;u_h=1080&amp;url=https%3A%2F%2Fwww.koton.com%2Ferkek-tisort%2F&amp;ref=https%3A%2F%2Fwww.koton.com%2F%3Fsrsltid%3DAfmBOorjzIYgcN8Cmlzu5rV24W39pFxxKFGIBC8wCXPjIDn9e9pCauTL&amp;hn=www.googleadservices.com&amp;frm=0&amp;tiba=Erkek%20Ti%C5%9F%C3%B6rt%2C%20Oversize%20Ti%C5%9F%C3%B6rt%20ve%20Polo%20Ti%C5%9F%C3%B6rt%20Modelleri%20%7C%20Koton&amp;npa=0&amp;pscdl=noapi&amp;auid=214605831.1752127471&amp;uaa=x86&amp;uab=64&amp;uafvl=Not)A%253BBrand%3B8.0.0.0%7CChromium%3B138.0.7204.101%7CGoogle%2520Chrome%3B138.0.7204.101&amp;uamb=0&amp;uam=&amp;uap=Windows&amp;uapv=15.0.0&amp;uaw=0&amp;fledge=1&amp;_tu=Cg&amp;data=event%3Dgtag.config" style="display: none; visibility: hidden;"></iframe><iframe allow="join-ad-interest-group" data-tagging-id="AW-940008333" data-load-time="1752722938855" height="0" width="0" src="https://td.doubleclick.net/td/rul/940008333?random=1752722938233&amp;cv=11&amp;fst=1752722938233&amp;fmt=3&amp;bg=ffffff&amp;guid=ON&amp;async=1&amp;gtm=45be57f1v9175984773z8856358421za200zb856358421&amp;gcd=13t3t3t3t5l1&amp;dma=0&amp;tag_exp=101509157~103116026~103200004~103233427~103351869~103351871~104684208~104684211~104732253~104732255~104908321~104908323~104964065~104964067~104967141~104967143&amp;u_w=1920&amp;u_h=1080&amp;url=https%3A%2F%2Fwww.koton.com%2Ferkek-tisort%2F&amp;ref=https%3A%2F%2Fwww.koton.com%2F%3Fsrsltid%3DAfmBOorjzIYgcN8Cmlzu5rV24W39pFxxKFGIBC8wCXPjIDn9e9pCauTL&amp;hn=www.googleadservices.com&amp;frm=0&amp;tiba=Erkek%20Ti%C5%9F%C3%B6rt%2C%20Oversize%20Ti%C5%9F%C3%B6rt%20ve%20Polo%20Ti%C5%9F%C3%B6rt%20Modelleri%20%7C%20Koton&amp;npa=0&amp;pscdl=noapi&amp;auid=214605831.1752127471&amp;uaa=x86&amp;uab=64&amp;uafvl=Not)A%253BBrand%3B8.0.0.0%7CChromium%3B138.0.7204.101%7CGoogle%2520Chrome%3B138.0.7204.101&amp;uamb=0&amp;uam=&amp;uap=Windows&amp;uapv=15.0.0&amp;uaw=0&amp;fledge=1&amp;_tu=CA&amp;data=ads_data_redaction%3Dtrue" style="display: none; visibility: hidden;"></iframe><iframe height="0" width="0" style="display: none; visibility: hidden;"></iframe><div classname="ins-ghost textads banner-ads banner_ads ad-unit ad-zone ad-space adsbox" class="ins-ghost textads banner-ads banner_ads ad-unit ad-zone ad-space adsbox" style="width: 0px !important; height: 1px !important; position: absolute !important; left: calc(-100vw) !important; top: calc(-100vh) !important;"></div><iframe height="0" width="0" hidden="" aria-hidden="true" title="Criteo DIS iframe"></iframe>
<script id="" text="" charset="" type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/js-sha256/0.9.0/sha256.min.js"></script>
<script type="text/javascript" id="" charset="">window.p2sq=window.p2sq||[];var cd_userGender="";if(cd_userGender.toLowerCase()==="male")cd_userGender="m";else if(cd_userGender.toLowerCase()==="female")cd_userGender="f";__p={};if(""&&""!="undefined")__p.em=sha256("");if(""&&""!="undefined")__p.ge=sha256(cd_userGender);window.p2sq.push({et:"Init",p:__p});p2sq.push({et:"PageView"});
!function(f,b,e,v,t,s){f.p2sq=f.p2sq||[];if(f.p2sf)return;f.p2sf=true;t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://cpi.ssevt.com/js/v4.4/koton.com");</script>
</body>`;
  
  const result = identifyProductContainer(sampleHTML);
  console.log('Test result:', result);
  return result;
}

// Export for use in other modules
export { identifyProductContainer, testProductContainer };

// Browser version (if not using Node.js)
if (typeof module === 'undefined') {
  // Remove JSDOM dependency for browser
  function identifyProductContainerBrowser(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    // ... rest of the function logic (same as above but using doc instead of dom.window.document)
  }
}