from enum import Enum


class ProductStatus(Enum):
    DRAFT = 'draft'
    ACTIVE = 'active'
    ARCHIVED = 'archived'


class SalesMode(Enum):
    QUOTE_ONLY = 'quote_only'
    BUY_AND_QUOTE = 'buy_and_quote'
    DIRECT_PURCHASE = 'direct_purchase'


class Availability(Enum):
    IN_STOCK = 'in_stock'
    MADE_TO_ORDER = 'made_to_order'
    OUT_OF_STOCK = 'out_of_stock'


class ProductSort(Enum):
    NEWEST = 'newest'
    OLDEST = 'oldest'
    FEATURED = 'featured'
    PRICE_ASC = 'price_asc'
    PRICE_DESC = 'price_desc'
    DISPLAY_ORDER = 'display_order'
