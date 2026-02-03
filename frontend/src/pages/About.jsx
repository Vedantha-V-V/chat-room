import React from 'react';
import './about.css';

function About() {
  return (
    <main className="about-page">
      <section className="description">
        <h2>Who We Are</h2>
        <p>
          Welcome to <strong>Art To Cart</strong>, your trusted destination for quality products and seamless shopping experiences. 
          Established in 2024, our mission is to make online shopping simple, affordable, and delightful for everyone.
        </p>
      </section>

      <section className="founders">
        <h2>Our Founders</h2>
        <ul>
          <li><strong>Ayush Khanuja</strong></li>
          <li><strong>Hemanth R</strong></li>
          <li><strong>Vedantha V V</strong></li>
        </ul>
      </section>

      <section className="location">
        <h2>Where We Are</h2>
        <p>
          Based in <strong>Bengaluru, India</strong>, we operate globally to bring products to your doorstep, no matter where you are.
        </p>
      </section>

      <section className="reviews">
        <h2>What Our Customers Say</h2>
        <div className="review">
          <p>"Art To Cart transformed the way I shop online. Highly recommended!"</p>
          <p>- Jeff Bezos.</p>
        </div>
        <div className="review">
          <p>"Exceptional customer service and great product variety. Love it!"</p>
          <p>- Jack Ma.</p>
        </div>
        <div className="review">
          <p>"Fast delivery and great deals. This is my go-to platform now."</p>
          <p>- Sundar Pichai.</p>
        </div>
      </section>
    </main>
  );
}

export default About;
