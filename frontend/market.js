document.addEventListener("DOMContentLoaded", function () {
  const output = document.getElementById("output");
  const buttons = document.querySelectorAll(".product-btn");

  // Product data (replace image paths with your own later)
  const products = {
    grains: [
      { name: "Rice", img: "C:\Users\ADITYA CHANDRA\Desktop\agri\images\rice.jpg" },
      { name: "Corn", img: "images/corn.jpg" },
      { name: "Wheat", img: "images/wheat.jpg" },
      { name: "Barley", img: "images/barley.jpg" },
    ],
    nuts: [
      { name: "Peanuts", img: "images/peanuts.jpg" },
      { name: "Cashew", img: "images/cashew.jpg" },
      { name: "Walnut", img: "images/walnut.jpg" },
      { name: "Almond", img: "images/almond.jpg" },
    ],
    coffee: [
      { name: "Coffee", img: "images/coffee.jpg" },
      { name: "Specialty Coffee", img: "images/specialtycoffee.jpg" },
      { name: "Green Coffee", img: "images/greencoffee.jpg" },
    ],
    carbon: [
      { name: "Carbon Credit", img: "images/carbon.jpg" },
      { name: "Eco Token", img: "images/ecotoken.jpg" },
    ],
    oils: [
      { name: "Olive Oil", img: "images/oliveoil.jpg" },
      { name: "Coconut Oil", img: "images/coconut.jpg" },
      { name: "Sunflower Oil", img: "images/sunflower.jpg" },
    ],
  };

  // Function to display products
  function showProducts(type) {
    output.innerHTML = "";
    products[type].forEach((p) => {
      const div = document.createElement("div");
      div.classList.add("product-card");
      div.innerHTML = `<img src="${p.img}" alt="${p.name}"><h3>${p.name.toUpperCase()}</h3>`;
      output.appendChild(div);
    });
  }

  // Load default (grains)
  showProducts("grains");

  // Add event listeners to buttons
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const type = btn.getAttribute("data-type");
      showProducts(type);
    });
  });
});
