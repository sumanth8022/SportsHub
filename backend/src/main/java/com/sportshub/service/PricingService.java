package com.sportshub.service;

import com.sportshub.domain.*;
import com.sportshub.dto.ApiDtos.*;
import com.sportshub.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.math.*;
import java.time.*;

@Service
public class PricingService {
    static final RoundingMode RM=RoundingMode.HALF_UP;
    static final BigDecimal PICNIC_PRICE=BigDecimal.valueOf(150);
    final VenueRepository venues; final ParkRepository parks; final StadiumRepository stadiums; final StandCategoryRepository stands; final CouponRepository coupons; final StadiumEventRepository events;
    @Value("${sportshub.pricing.evening-weekend-multiplier:1.30}") BigDecimal peak;
    @Value("${sportshub.pricing.child-multiplier:0.60}") BigDecimal child;
    @Value("${sportshub.pricing.family-discount:0.90}") BigDecimal family;
    @Value("${sportshub.pricing.convenience-fee-rate:0.02}") BigDecimal fee;

    public PricingService(VenueRepository v,ParkRepository p,StadiumRepository s,StandCategoryRepository st,CouponRepository c,StadiumEventRepository e){venues=v;parks=p;stadiums=s;stands=st;coupons=c;events=e;}
    BigDecimal r(BigDecimal x){return x.setScale(0,RM);} int n(Integer x){return x==null?0:x;}

    BigDecimal adult(QuoteRequest q){
        LocalDate d=q.visitDate()==null?LocalDate.now():q.visitDate();
        if(q.itemType()==BookingItem.ItemType.SLOT){
            var v=venues.findById(q.refId()).orElseThrow(()->new IllegalArgumentException("Venue not found: "+q.refId()));
            var p=v.getPricePerHour(); int h=n(q.startHour());
            if(h>=17||d.getDayOfWeek()==DayOfWeek.SATURDAY||d.getDayOfWeek()==DayOfWeek.SUNDAY)p=p.multiply(peak);
            return r(p);
        }
        if(q.itemType()==BookingItem.ItemType.PARK){
            var p=parks.findById(q.refId()).orElseThrow(()->new IllegalArgumentException("Park not found: "+q.refId()));
            var x=p.getBasePrice();
            if(d.getDayOfWeek()==DayOfWeek.SATURDAY||d.getDayOfWeek()==DayOfWeek.SUNDAY)x=x.multiply(peak);
            return r(x);
        }
        var s=stadiums.findById(q.refId()).orElseThrow(()->new IllegalArgumentException("Stadium not found: "+q.refId()));
        if(q.eventId()!=null && events.findById(q.eventId()).map(e->!e.getStadium().getId().equals(s.getId())).orElse(true)) throw new IllegalArgumentException("Event does not belong to this stadium.");
        var st=stands.findById(q.standId()==null?1L:q.standId()).orElseThrow(()->new IllegalArgumentException("Stand not found."));
        return r(s.getBasePrice().multiply(st.getPriceMultiplier()));
    }

    public QuoteResponse quote(QuoteRequest q){
        var t=q.tickets(); if(t==null) throw new IllegalArgumentException("tickets are required.");
        int a=n(t.adult()),c=n(t.child()),f=n(t.family()),pic=n(t.picnic());
        var ap=adult(q); var cp=r(ap.multiply(child));
        var line=ap.multiply(BigDecimal.valueOf(a)).add(cp.multiply(BigDecimal.valueOf(c)));
        if(f>0){
            int fa=n(t.famAdults()),fc=n(t.famChildren());
            if(fa<1||fa>4||fc<0||fc>4) throw new IllegalArgumentException("Family must contain 1-4 adults and 0-4 children.");
            var fam=ap.multiply(BigDecimal.valueOf(fa)).add(cp.multiply(BigDecimal.valueOf(fc)));
            line=line.add(r(fam.multiply(family)).multiply(BigDecimal.valueOf(f)));
        }
        if(pic>0){ if(q.itemType()!=BookingItem.ItemType.PARK) throw new IllegalArgumentException("Picnic options are available only for parks."); line=line.add(PICNIC_PRICE.multiply(BigDecimal.valueOf(pic))); }
        line=r(line);
        var disc=BigDecimal.ZERO; String msg=null;
        if(q.coupon()!=null&&!q.coupon().isBlank()){
            var x=coupons.findByCodeIgnoreCase(q.coupon().trim()).orElse(null);
            if(x==null||!x.isActive()||(x.getValidUntil()!=null&&x.getValidUntil().isBefore(LocalDateTime.now()))) throw new IllegalArgumentException("That code isn't valid.");
            disc=r(line.multiply(x.getPercentOff()).divide(BigDecimal.valueOf(100),8,RM)); msg="Coupon applied";
        }
        var conv=r(line.multiply(fee)); var total=r(line.subtract(disc).add(conv)); int split=Math.max(1,n(q.splitCount()));
        return new QuoteResponse(q.itemType(),q.refId(),line,line,disc,conv,total,r(total.divide(BigDecimal.valueOf(split),8,RM)),msg);
    }
}
